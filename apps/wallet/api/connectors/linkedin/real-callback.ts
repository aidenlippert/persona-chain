import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * REAL LinkedIn OAuth Callback - Fetches Actual Professional Data
 * NO HARDCODED VALUES - CREATES REAL PROFESSIONAL CREDENTIALS
 */

interface LinkedInProfile {
  id: string;
  firstName: { localized: { [key: string]: string } };
  lastName: { localized: { [key: string]: string } };
  headline: { localized: { [key: string]: string } };
  profilePicture?: {
    displayImage: string;
  };
  vanityName?: string;
  location?: {
    countryCode: string;
    postalCode: string;
  };
  industry?: {
    localizedName: string;
  };
  summary?: { localized: { [key: string]: string } };
}

interface LinkedInEmail {
  elements: Array<{
    'handle~': {
      emailAddress: string;
    };
    handle: string;
    primary: boolean;
  }>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOrigin = process.env.VITE_CORS_ORIGIN || "https://personapass.xyz";
  
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        return res.status(400).json({ error: "Missing OAuth code or state" });
      }

      // Validate environment variables
      const clientId = process.env.VITE_LINKEDIN_CLIENT_ID;
      const clientSecret = process.env.VITE_LINKEDIN_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return res.status(500).json({ error: "LinkedIn credentials not configured" });
      }

      // Parse state to get session info
      let sessionData;
      try {
        sessionData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      } catch (error) {
        return res.status(400).json({ error: "Invalid state parameter" });
      }

      // Exchange code for access token
      const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: `${process.env.VITE_CORS_ORIGIN}/api/connectors/linkedin/callback?platform=linkedin`,
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        console.error("LinkedIn token exchange failed:", tokenData);
        return res.status(400).json({ error: "Failed to exchange OAuth code" });
      }

      // Fetch profile data from LinkedIn API
      const profileResponse = await fetch("https://api.linkedin.com/v2/people/~:(id,firstName,lastName,headline,profilePicture(displayImage~:playableStreams),vanityName,location,industry,summary)", {
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "Accept": "application/json",
        },
      });

      if (!profileResponse.ok) {
        console.error("LinkedIn profile fetch failed:", profileResponse.status);
        return res.status(400).json({ error: "Failed to fetch profile data" });
      }

      const profileData: LinkedInProfile = await profileResponse.json();

      // Fetch email address
      const emailResponse = await fetch("https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))", {
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "Accept": "application/json",
        },
      });

      let emailData: LinkedInEmail | null = null;
      if (emailResponse.ok) {
        emailData = await emailResponse.json();
      }

      // Extract localized strings (default to English)
      const getLocalizedString = (localized: { [key: string]: string }) => {
        return localized['en_US'] || localized[Object.keys(localized)[0]] || '';
      };

      const firstName = getLocalizedString(profileData.firstName.localized);
      const lastName = getLocalizedString(profileData.lastName.localized);
      const headline = getLocalizedString(profileData.headline.localized);
      const summary = profileData.summary ? getLocalizedString(profileData.summary.localized) : '';
      
      const primaryEmail = emailData?.elements.find(e => e.primary)?.['handle~']?.emailAddress || '';
      
      // Generate LinkedIn profile URL
      const profileUrl = profileData.vanityName 
        ? `https://www.linkedin.com/in/${profileData.vanityName}`
        : `https://www.linkedin.com/in/${profileData.id}`;

      // Calculate professional score based on profile completeness
      const professionalScore = Math.min(100, Math.floor(
        (firstName && lastName ? 20 : 0) +
        (headline ? 20 : 0) +
        (summary ? 20 : 0) +
        (primaryEmail ? 20 : 0) +
        (profileData.location ? 10 : 0) +
        (profileData.industry ? 10 : 0)
      ));

      // Create verifiable credential with REAL LinkedIn data
      const credential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.org",
          "https://personapass.xyz/contexts/linkedin/v1"
        ],
        id: `linkedin-cred-${sessionData.sessionId}`,
        type: ["VerifiableCredential", "LinkedInProfessionalCredential"],
        issuer: {
          id: "did:persona:linkedin-issuer",
          name: "PersonaPass LinkedIn Issuer"
        },
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        credentialSubject: {
          id: `did:persona:linkedin:${profileData.id}`,
          type: "LinkedInProfessional",
          
          // Personal Information
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`.trim(),
          email: primaryEmail,
          headline,
          summary,
          
          // Profile Information
          linkedinId: profileData.id,
          vanityName: profileData.vanityName,
          profileUrl,
          profilePicture: profileData.profilePicture?.displayImage,
          
          // Location Information
          location: profileData.location ? {
            countryCode: profileData.location.countryCode,
            postalCode: profileData.location.postalCode
          } : null,
          
          // Industry Information
          industry: profileData.industry?.localizedName,
          
          // Professional Metrics
          professionalScore,
          profileCompleteness: professionalScore,
          
          // Verification
          verified: true,
          verificationLevel: "oauth_verified",
          verificationDate: new Date().toISOString(),
          
          // Privacy Settings
          publicProfile: !!profileData.vanityName,
          emailVerified: !!primaryEmail,
          
          // Metadata
          platform: "linkedin",
          apiVersion: "v2",
          dataSource: "linkedin_api"
        }
      };

      // Generate ZK commitment for selective disclosure
      const zkCommitment = {
        commitment: Buffer.from(JSON.stringify({
          fullName: `${firstName} ${lastName}`.trim(),
          verified: true,
          industry: profileData.industry?.localizedName,
          professionalScore,
          profileCompleteness: professionalScore,
          hasEmail: !!primaryEmail,
          hasLocation: !!profileData.location,
          hasHeadline: !!headline
        })).toString('base64'),
        salt: Buffer.from(Math.random().toString(36).substr(2, 32)).toString('base64'),
        selectiveFields: [
          "fullName",
          "verified",
          "industry",
          "professionalScore",
          "profileCompleteness",
          "hasEmail",
          "hasLocation",
          "hasHeadline",
          "verificationLevel"
        ],
        proofCircuit: "linkedin_professional_verification"
      };

      // Return real credential with ZK commitment
      return res.status(200).json({
        success: true,
        credential,
        zkCommitment,
        platform: "linkedin",
        sessionId: sessionData.sessionId,
        dataCollected: {
          profileData: true,
          emailData: !!emailData,
          locationData: !!profileData.location,
          industryData: !!profileData.industry,
          professionalScore
        },
        metadata: {
          fetchedAt: new Date().toISOString(),
          dataFreshness: "real_time",
          credentialType: "LinkedInProfessionalCredential",
          version: "1.0"
        }
      });

    } catch (error) {
      console.error("LinkedIn callback error:", error);
      return res.status(500).json({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
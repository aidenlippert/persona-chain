import axios from 'axios';
import { config } from '../config/config';
import { ResidencyVerification, DemographicData, GeographicData } from '../types/government';

export interface CensusAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface CensusGeocodeResponse {
  result: {
    addressMatches: Array<{
      matchedAddress: string;
      coordinates: {
        x: number; // longitude
        y: number; // latitude
      };
      addressComponents: {
        zip: string;
        streetName: string;
        preType: string;
        city: string;
        preDirection: string;
        suffixDirection: string;
        fromAddress: string;
        toAddress: string;
        suffixType: string;
        suffixQualifier: string;
        state: string;
        streetNumber: string;
      };
      tigerLine: {
        side: string;
        tigerLineId: string;
      };
    }>;
  };
}

export interface CensusDemographicResponse {
  data: Array<Array<string | number>>;
  headers: string[];
}

export class CensusService {
  /**
   * Verify address using Census Geocoding API
   */
  async verifyAddress(address: CensusAddress): Promise<ResidencyVerification> {
    try {
      console.log('🏛️ Verifying address with US Census Bureau...');
      
      const addressLine = `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
      
      const response = await axios.get(
        `${config.census.geographyUrl}${config.census.endpoints.geocoding}`,
        {
          params: {
            address: addressLine,
            benchmark: 'Public_AR_Current',
            format: 'json'
          },
          timeout: 30000
        }
      );
      
      const geocodeData: CensusGeocodeResponse = response.data;
      
      if (!geocodeData.result?.addressMatches?.length) {
        return {
          verified: false,
          address: addressLine,
          standardizedAddress: null,
          confidence: 0,
          source: 'US Census Bureau',
          verifiedAt: new Date().toISOString(),
          error: 'Address not found in Census records'
        };
      }
      
      const match = geocodeData.result.addressMatches[0];
      const components = match.addressComponents;
      
      const standardizedAddress = {
        street: `${components.streetNumber} ${components.preDirection} ${components.streetName} ${components.suffixType}`.trim(),
        city: components.city,
        state: components.state,
        zip: components.zip
      };
      
      const verification: ResidencyVerification = {
        verified: true,
        address: addressLine,
        standardizedAddress: `${standardizedAddress.street}, ${standardizedAddress.city}, ${standardizedAddress.state} ${standardizedAddress.zip}`,
        confidence: 0.95, // High confidence for Census geocoding
        coordinates: {
          latitude: match.coordinates.y,
          longitude: match.coordinates.x
        },
        source: 'US Census Bureau',
        verifiedAt: new Date().toISOString(),
        metadata: {
          tigerLineId: match.tigerLine.tigerLineId,
          addressComponents: components,
          matchType: 'exact'
        }
      };
      
      console.log('✅ Address verified with Census Bureau');
      return verification;
      
    } catch (error) {
      console.error('❌ Error verifying address with Census:', error);
      
      // Return mock verification for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock address verification');
        return {
          verified: true,
          address: `${address.street}, ${address.city}, ${address.state} ${address.zip}`,
          standardizedAddress: `${address.street}, ${address.city}, ${address.state} ${address.zip}`,
          confidence: 0.85,
          source: 'US Census Bureau (Mock)',
          verifiedAt: new Date().toISOString(),
          metadata: {
            mockData: true
          }
        };
      }
      
      throw new Error('Failed to verify address with Census Bureau');
    }
  }
  
  /**
   * Get demographic data for a geographic area
   */
  async getDemographicData(
    geography: 'state' | 'county' | 'tract' | 'block group',
    geoCode: string
  ): Promise<DemographicData> {
    try {
      console.log(`📊 Fetching ${geography} demographic data from Census...`);
      
      // Define variables to fetch (ACS 1-Year estimates)
      const variables = [
        'B01001_001E', // Total population
        'B25001_001E', // Housing units
        'B08301_001E', // Total commuters
        'B19013_001E', // Median household income
        'B25077_001E', // Median home value
        'B15003_022E', // Bachelor's degree
        'B15003_023E', // Master's degree
        'B15003_024E', // Professional degree
        'B15003_025E', // Doctorate degree
      ];
      
      let geoQuery: string;
      switch (geography) {
        case 'state':
          geoQuery = `state:${geoCode}`;
          break;
        case 'county':
          geoQuery = `county:${geoCode.split(',')[1]}&in=state:${geoCode.split(',')[0]}`;
          break;
        case 'tract':
          geoQuery = `tract:${geoCode.split(',')[2]}&in=state:${geoCode.split(',')[0]}&in=county:${geoCode.split(',')[1]}`;
          break;
        default:
          throw new Error(`Unsupported geography type: ${geography}`);
      }
      
      const response = await axios.get(
        `${config.census.baseUrl}${config.census.endpoints.demographics}`,
        {
          params: {
            get: variables.join(','),
            for: geoQuery,
            key: config.census.apiKey
          },
          timeout: 30000
        }
      );
      
      const censusData: CensusDemographicResponse = response.data;
      
      if (!censusData.data || censusData.data.length < 2) {
        throw new Error('No demographic data found');
      }
      
      // Parse the response (first row is headers, second row is data)
      const headers = censusData.data[0];
      const values = censusData.data[1];
      
      const dataMap = new Map();
      headers.forEach((header, index) => {
        dataMap.set(header as string, values[index]);
      });
      
      const totalPopulation = Number(dataMap.get('B01001_001E')) || 0;
      const bachelors = Number(dataMap.get('B15003_022E')) || 0;
      const masters = Number(dataMap.get('B15003_023E')) || 0;
      const professional = Number(dataMap.get('B15003_024E')) || 0;
      const doctorate = Number(dataMap.get('B15003_025E')) || 0;
      
      const demographic: DemographicData = {
        geography,
        geoCode,
        population: {
          total: totalPopulation,
          density: 0 // Would need area data to calculate
        },
        housing: {
          totalUnits: Number(dataMap.get('B25001_001E')) || 0,
          medianValue: Number(dataMap.get('B25077_001E')) || 0
        },
        income: {
          medianHousehold: Number(dataMap.get('B19013_001E')) || 0
        },
        education: {
          bachelorsOrHigher: bachelors + masters + professional + doctorate,
          totalPopulation: totalPopulation
        },
        employment: {
          totalCommuters: Number(dataMap.get('B08301_001E')) || 0
        },
        source: 'US Census Bureau ACS',
        year: 2022,
        fetchedAt: new Date().toISOString()
      };
      
      console.log(`✅ Demographic data fetched for ${geography}: ${geoCode}`);
      return demographic;
      
    } catch (error) {
      console.error('❌ Error fetching demographic data:', error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock demographic data');
        return {
          geography,
          geoCode,
          population: {
            total: 50000,
            density: 1200
          },
          housing: {
            totalUnits: 22000,
            medianValue: 350000
          },
          income: {
            medianHousehold: 65000
          },
          education: {
            bachelorsOrHigher: 15000,
            totalPopulation: 50000
          },
          employment: {
            totalCommuters: 25000
          },
          source: 'US Census Bureau ACS (Mock)',
          year: 2022,
          fetchedAt: new Date().toISOString()
        };
      }
      
      throw new Error('Failed to fetch demographic data from Census Bureau');
    }
  }
  
  /**
   * Get geographic data (FIPS codes, coordinates) for an address
   */
  async getGeographicData(address: CensusAddress): Promise<GeographicData> {
    try {
      console.log('🗺️ Fetching geographic data from Census...');
      
      // First, geocode the address
      const verification = await this.verifyAddress(address);
      
      if (!verification.verified || !verification.coordinates) {
        throw new Error('Could not geocode address for geographic data');
      }
      
      // Use reverse geocoding to get FIPS codes
      const response = await axios.get(
        `${config.census.geographyUrl}/geographies/onelineaddress`,
        {
          params: {
            address: verification.standardizedAddress || verification.address,
            benchmark: 'Public_AR_Current',
            vintage: 'Current_Current',
            format: 'json'
          },
          timeout: 30000
        }
      );
      
      const geoData = response.data;
      
      if (!geoData.result?.geographies) {
        throw new Error('No geographic data found');
      }
      
      const geographies = geoData.result.geographies;
      const state = geographies['States']?.[0];
      const county = geographies['Counties']?.[0];
      const tract = geographies['Census Tracts']?.[0];
      const block = geographies['Census Blocks']?.[0];
      
      const geographic: GeographicData = {
        address: verification.standardizedAddress || verification.address,
        coordinates: verification.coordinates,
        fipsCodes: {
          state: state?.STATE || '',
          county: county?.COUNTY || '',
          tract: tract?.TRACT || '',
          block: block?.BLOCK || ''
        },
        geographies: {
          state: state?.NAME || '',
          county: county?.NAME || '',
          tract: tract?.NAME || '',
          congressionalDistrict: geographies['Congressional Districts']?.[0]?.CD || '',
          schoolDistrict: geographies['Unified School Districts']?.[0]?.NAME || ''
        },
        source: 'US Census Bureau',
        fetchedAt: new Date().toISOString()
      };
      
      console.log('✅ Geographic data fetched from Census');
      return geographic;
      
    } catch (error) {
      console.error('❌ Error fetching geographic data:', error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock geographic data');
        return {
          address: `${address.street}, ${address.city}, ${address.state} ${address.zip}`,
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060
          },
          fipsCodes: {
            state: '36',
            county: '061',
            tract: '007400',
            block: '1001'
          },
          geographies: {
            state: 'New York',
            county: 'New York County',
            tract: 'Census Tract 74',
            congressionalDistrict: '12',
            schoolDistrict: 'New York City Department of Education'
          },
          source: 'US Census Bureau (Mock)',
          fetchedAt: new Date().toISOString()
        };
      }
      
      throw new Error('Failed to fetch geographic data from Census Bureau');
    }
  }
  
  /**
   * Search for places/locations
   */
  async searchPlaces(query: string, maxResults: number = 10): Promise<any[]> {
    try {
      console.log('🔍 Searching places with Census geocoding...');
      
      const response = await axios.get(
        `${config.census.geographyUrl}${config.census.endpoints.geocoding}`,
        {
          params: {
            address: query,
            benchmark: 'Public_AR_Current',
            format: 'json'
          },
          timeout: 30000
        }
      );
      
      const results = response.data.result?.addressMatches || [];
      
      return results.slice(0, maxResults).map((match: any) => ({
        address: match.matchedAddress,
        coordinates: {
          latitude: match.coordinates.y,
          longitude: match.coordinates.x
        },
        components: match.addressComponents,
        confidence: 0.9
      }));
      
    } catch (error) {
      console.error('❌ Error searching places:', error);
      return [];
    }
  }
  
  /**
   * Get population statistics for a given area
   */
  async getPopulationStatistics(fipsCode: string, level: 'state' | 'county' | 'tract'): Promise<any> {
    try {
      console.log(`📈 Fetching population statistics for ${level}: ${fipsCode}`);
      
      const variables = [
        'P1_001N', // Total population
        'P1_003N', // White alone
        'P1_004N', // Black or African American alone
        'P1_006N', // Asian alone
        'P1_009N', // Two or more races
        'P2_002N', // Hispanic or Latino
      ];
      
      let geoQuery: string;
      switch (level) {
        case 'state':
          geoQuery = `state:${fipsCode}`;
          break;
        case 'county':
          geoQuery = `county:${fipsCode.slice(-3)}&in=state:${fipsCode.slice(0, 2)}`;
          break;
        case 'tract':
          geoQuery = `tract:${fipsCode.slice(-6)}&in=state:${fipsCode.slice(0, 2)}&in=county:${fipsCode.slice(2, 5)}`;
          break;
        default:
          throw new Error(`Unsupported level: ${level}`);
      }
      
      const response = await axios.get(
        `${config.census.baseUrl}${config.census.endpoints.population}`,
        {
          params: {
            get: variables.join(','),
            for: geoQuery,
            key: config.census.apiKey
          },
          timeout: 30000
        }
      );
      
      console.log('✅ Population statistics fetched');
      return response.data;
      
    } catch (error) {
      console.error('❌ Error fetching population statistics:', error);
      throw error;
    }
  }
}
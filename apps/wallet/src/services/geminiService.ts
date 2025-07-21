/**
 * Gemini AI Service for Persona Wallet
 * Integrates Google's Gemini AI for intelligent features
 */

import { Observable } from "zen-observable-ts";

interface GeminiConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

interface GeminiRequest {
  prompt: string;
  context?: string;
  temperature?: number;
  maxTokens?: number;
}

interface GeminiResponse {
  text: string;
  confidence: number;
  tokens: number;
  finishReason: string;
}

interface CodeGenerationRequest {
  description: string;
  language: string;
  framework?: string;
  style?: string;
}

interface SecurityAnalysisRequest {
  code: string;
  language: string;
  context?: string;
}

interface SecurityAnalysisResponse {
  issues: Array<{
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    line?: number;
    recommendation: string;
  }>;
  score: number;
  summary: string;
}

/**
 * Gemini AI Service
 * Provides AI-powered development assistance
 */
export class GeminiService {
  private config: GeminiConfig;
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  constructor(config: GeminiConfig) {
    this.config = config;
  }

  /**
   * Generate code based on natural language description
   */
  async generateCode(request: CodeGenerationRequest): Promise<string> {
    const prompt = this.buildCodeGenerationPrompt(request);

    const response = await this.makeRequest({
      prompt,
      temperature: 0.3, // Lower temperature for more focused code generation
      maxTokens: 2000,
    });

    return this.extractCodeFromResponse(response.text);
  }

  /**
   * Analyze code for security vulnerabilities
   */
  async analyzeCodeSecurity(
    request: SecurityAnalysisRequest,
  ): Promise<SecurityAnalysisResponse> {
    const prompt = this.buildSecurityAnalysisPrompt(request);

    const response = await this.makeRequest({
      prompt,
      temperature: 0.1, // Very low temperature for consistent security analysis
      maxTokens: 1500,
    });

    return this.parseSecurityAnalysis(response.text);
  }

  /**
   * Optimize code for performance
   */
  async optimizeCode(code: string, language: string): Promise<string> {
    const prompt = `
      Optimize the following ${language} code for performance, maintainability, and best practices:
      
      Code:
      \`\`\`${language}
      ${code}
      \`\`\`
      
      Focus on:
      - Performance improvements
      - Memory optimization
      - Code clarity
      - TypeScript best practices
      - React performance patterns (if applicable)
      
      Return only the optimized code without explanations.
    `;

    const response = await this.makeRequest({
      prompt,
      temperature: 0.2,
      maxTokens: 2000,
    });

    return this.extractCodeFromResponse(response.text);
  }

  /**
   * Generate TypeScript types from JSON schema or example data
   */
  async generateTypes(data: any, typeName: string): Promise<string> {
    const prompt = `
      Generate TypeScript interfaces for the following data structure.
      Name the main interface "${typeName}".
      
      Data:
      \`\`\`json
      ${JSON.stringify(data, null, 2)}
      \`\`\`
      
      Requirements:
      - Use proper TypeScript syntax
      - Include optional properties where appropriate
      - Add JSDoc comments for complex types
      - Use union types for enums
      - Follow Persona naming conventions
      
      Return only the TypeScript interface definitions.
    `;

    const response = await this.makeRequest({
      prompt,
      temperature: 0.2,
      maxTokens: 1000,
    });

    return this.extractCodeFromResponse(response.text);
  }

  /**
   * Generate test cases for code
   */
  async generateTests(
    code: string,
    language: string,
    framework = "vitest",
  ): Promise<string> {
    const prompt = `
      Generate comprehensive test cases for the following ${language} code using ${framework}:
      
      Code:
      \`\`\`${language}
      ${code}
      \`\`\`
      
      Requirements:
      - Cover all functions and edge cases
      - Use proper mocking for dependencies
      - Include error handling tests
      - Follow Persona testing conventions
      - Use descriptive test names
      
      Return only the test code.
    `;

    const response = await this.makeRequest({
      prompt,
      temperature: 0.3,
      maxTokens: 2000,
    });

    return this.extractCodeFromResponse(response.text);
  }

  /**
   * Stream responses for real-time interaction
   */
  streamResponse(request: GeminiRequest): Observable<string> {
    return new Observable<string>((observer) => {
      this.makeStreamRequest(request, (chunk: string) => {
        observer.next(chunk);
      })
        .then(() => {
          observer.complete();
        })
        .catch((error) => {
          observer.error(error);
        });
    });
  }

  /**
   * Build prompt for code generation
   */
  private buildCodeGenerationPrompt(request: CodeGenerationRequest): string {
    return `
      Generate ${request.language} code for the following requirements:
      
      Description: ${request.description}
      ${request.framework ? `Framework: ${request.framework}` : ""}
      ${request.style ? `Style: ${request.style}` : ""}
      
      Requirements:
      - Follow Persona coding standards
      - Use TypeScript strict mode
      - Include proper error handling
      - Add JSDoc comments
      - Follow security best practices
      - Optimize for performance
      
      Return only the code without explanations.
    `;
  }

  /**
   * Build prompt for security analysis
   */
  private buildSecurityAnalysisPrompt(
    request: SecurityAnalysisRequest,
  ): string {
    return `
      Analyze the following ${request.language} code for security vulnerabilities:
      
      Code:
      \`\`\`${request.language}
      ${request.code}
      \`\`\`
      
      ${request.context ? `Context: ${request.context}` : ""}
      
      Focus on:
      - SQL injection vulnerabilities
      - XSS vulnerabilities
      - Authentication issues
      - Authorization problems
      - Input validation issues
      - Cryptographic weaknesses
      - Memory safety issues
      - Privacy concerns
      
      Return a JSON response with the following structure:
      {
        "issues": [
          {
            "severity": "low|medium|high|critical",
            "description": "Description of the issue",
            "line": 10,
            "recommendation": "How to fix this issue"
          }
        ],
        "score": 85,
        "summary": "Overall security assessment"
      }
    `;
  }

  /**
   * Make API request to Gemini
   */
  private async makeRequest(request: GeminiRequest): Promise<GeminiResponse> {
    const response = await fetch(
      `${this.baseUrl}/models/${this.config.model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: request.prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: request.temperature || this.config.temperature,
            maxOutputTokens: request.maxTokens || this.config.maxTokens,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Gemini API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    return {
      text: data.candidates[0].content.parts[0].text,
      confidence: data.candidates[0].safetyRatings?.[0]?.probability || 0,
      tokens: data.usageMetadata?.totalTokenCount || 0,
      finishReason: data.candidates[0].finishReason,
    };
  }

  /**
   * Make streaming request to Gemini
   */
  private async makeStreamRequest(
    request: GeminiRequest,
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/models/${this.config.model}:streamGenerateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: request.prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: request.temperature || this.config.temperature,
            maxOutputTokens: request.maxTokens || this.config.maxTokens,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Gemini API error: ${response.status} ${response.statusText}`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete JSON objects
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.trim() && !line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              onChunk(text);
            }
          } catch (e) {
            // Ignore malformed JSON
          }
        }
      }
    }
  }

  /**
   * Extract code from response text
   */
  private extractCodeFromResponse(text: string): string {
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
    const matches = text.match(codeBlockRegex);

    if (matches) {
      return matches
        .map((match) => match.replace(/```(?:\w+)?\n/, "").replace(/```$/, ""))
        .join("\n\n");
    }

    return text;
  }

  /**
   * Parse security analysis response
   */
  private parseSecurityAnalysis(text: string): SecurityAnalysisResponse {
    try {
      const jsonMatch = text.match(/```json\n([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try to parse as direct JSON
      return JSON.parse(text);
    } catch (e) {
      // Fallback to default response
      return {
        issues: [],
        score: 0,
        summary: "Failed to parse security analysis",
      };
    }
  }
}

// Default configuration
const defaultConfig: GeminiConfig = {
  apiKey: process.env.GEMINI_API_KEY || "",
  model: "gemini-1.5-pro",
  maxTokens: 2048,
  temperature: 0.3,
};

// Export singleton instance
export const geminiService = new GeminiService(defaultConfig);

// Export types for external use
export type {
  GeminiConfig,
  GeminiRequest,
  GeminiResponse,
  CodeGenerationRequest,
  SecurityAnalysisRequest,
  SecurityAnalysisResponse,
};

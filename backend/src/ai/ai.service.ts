import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { GoogleGenAI } from '@google/genai';
import { AIQueryDto } from './dto/ai-query.dto';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private aiClient: GoogleGenAI | null = null;

  constructor(
    private configService: ConfigService,
    private auditService: AuditService,
  ) {
    const apiKey = this.configService.get<string>('gemini.apiKey');
    if (apiKey && apiKey.trim().length > 0) {
      this.aiClient = new GoogleGenAI({ apiKey });
    } else {
      this.logger.warn('GEMINI_API_KEY is not configured in backend environment. AI fallback active.');
    }
  }

  async processQuery(
    dto: AIQueryDto,
    userId: string,
    organizationId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ response: string; model: string }> {
    const fullPrompt = `
As a world-class certified financial analyst and strategic advisor for the FINAGROW Financial Management & Growth Platform, your name is FINAGROW AI.
Your goal is to provide insightful, clear, mathematically sound, and actionable financial advice based on the user's business query and current financial context.
Do not provide generic vague advice. Be specific, data-driven, and structure answers with clean Markdown formatting (bullet points, bold key metrics, and financial action recommendations).

**Current Financial Context:**
${dto.context || 'Context: Standard enterprise ledger baseline active. Multi-entity consolidation and cash flow operations running.'}

**User's Question:**
"${dto.prompt}"

**Your Analysis and Strategic Financial Advice:**
    `.trim();

    let outputText = '';
    const modelName = 'gemini-2.5-flash';

    if (this.aiClient) {
      try {
        const response = await this.aiClient.models.generateContent({
          model: modelName,
          contents: fullPrompt,
          config: {
            temperature: 0.4,
            topP: 0.95,
          },
        });

        outputText = response.text || 'I analyzed your query, but no text output was generated. Please try again.';
      } catch (error) {
        this.logger.error(`Error calling Google Gemini API: ${error.message}`, error.stack);
        outputText = `### 📊 FINAGROW AI Strategic Financial Overview\n\n*Based on your query regarding:* **"${dto.prompt}"**\n\n- **Liquidity & Working Capital:** Maintain an operational cash reserve buffer equal to at least 3-6 months of fixed recurring operating expenses.\n- **Accounts Receivable Health:** Accelerate collection cycles by implementing 2/10 Net 30 trade credit incentives to minimize aging invoices.\n- **Tax Compliance Optimization:** Ensure input VAT (PPN Masukan) is promptly reconciled against output VAT (PPN Keluaran) before each tax period deadline.\n\n*(Note: Gemini cloud service temporarily in offline advisory mode. Backend secure proxy operational.)*`;
      }
    } else {
      outputText = `### 📊 FINAGROW AI Strategic Financial Overview\n\n*Analysis for:* **"${dto.prompt}"**\n\n1. **Working Capital Management:** Ensure real-time monitoring of Cash and Bank accounts against outstanding payables (AP) to maintain positive net operating cash flow.\n2. **Profitability & Margins:** Track gross margin per business line and benchmark against operating overhead to safeguard net profit targets.\n3. **Financial Governance:** Maintain strict adherence to double-entry ledger balancing and regular bank reconciliations.\n\n*(Server AI proxy active. Set GEMINI_API_KEY in backend/.env for live cloud-connected Gemini 2.5 Flash analysis.)*`;
    }

    // Write Audit Log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'AI_QUERY_EXECUTED',
      resourceType: 'AIConversation',
      metadata: {
        promptLength: dto.prompt.length,
        hasContext: !!dto.context,
        model: modelName,
      },
      ipAddress,
      userAgent,
    });

    return {
      response: outputText,
      model: modelName,
    };
  }
}

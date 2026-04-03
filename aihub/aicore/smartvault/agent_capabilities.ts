export interface AgentCapabilities {
  canAnswerProtocolQuestions: boolean
  canAnswerTokenQuestions: boolean
  canDescribeTooling: boolean
  canReportEcosystemNews: boolean
  canHandleWalletTracking?: boolean
  canAnalyzeSecurityRisks?: boolean
}

export interface AgentFlags {
  requiresExactInvocation: boolean
  noAdditionalCommentary: boolean
  strictJsonOutput?: boolean
  denyNonSolanaTopics?: boolean
}

export interface AgentProfile {
  id: string
  name: string
  version: string
  description: string
  capabilities: AgentCapabilities
  flags: AgentFlags
}

export const SOLANA_AGENT_CAPABILITIES: AgentCapabilities = {
  canAnswerProtocolQuestions: true,
  canAnswerTokenQuestions: true,
  canDescribeTooling: true,
  canReportEcosystemNews: true,
  canHandleWalletTracking: true,
  canAnalyzeSecurityRisks: true,
}

export const SOLANA_AGENT_FLAGS: AgentFlags = {
  requiresExactInvocation: true,
  noAdditionalCommentary: true,
  strictJsonOutput: true,
  denyNonSolanaTopics: true,
}

export const SOLANA_AGENT_PROFILE: AgentProfile = {
  id: "solana-knowledge-agent",
  name: "Solana Knowledge Agent",
  version: "1.1.0",
  description:
    "Specialized agent for answering questions about Solana protocols, tokens, tooling, wallets, security, and ecosystem updates",
  capabilities: SOLANA_AGENT_CAPABILITIES,
  flags: SOLANA_AGENT_FLAGS,
}

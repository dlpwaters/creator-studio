export const workflowTranslations = {
  studio: 'Creation studio',
  createGroup: 'Create',
  createFromNotebook: 'Create from notebook',
  readiness: 'Research readiness',
  checking: 'Checking source readiness…',
  readinessError:
    'Source readiness could not be checked. Retry, or open the studio to review this notebook.',
  ready: '{sources} and {notes} ready to use.',
  sourceSingular: 'source',
  sourcePlural: 'sources',
  noteSingular: 'note',
  notePlural: 'notes',
  readyHint:
    'Turn your research into slides, a brief, study cards, or an explainer.',
  processing: 'Sources processing: {count}.',
  processingHint:
    'Ready material can be used now. Open a source to check its progress.',
  failed: 'Sources needing attention: {count}.',
  failedHint:
    'Open an affected source to review the error and retry processing.',
  unavailable: 'Sources without usable text: {count}.',
  unavailableHint: 'Open a source to check processing or add readable content.',
  needsText: 'This material needs readable text before it can be used.',
  empty: 'Start with a source or a note.',
  emptyHint: 'Add a document, a link, or pasted text before creating material.',
  addSources: 'Add sources',
  reviewSources: 'Review affected sources',
  reviewSource: 'Review source: {title}',
  retry: 'Retry',
  providerTitle: 'Connect a model, then create',
  providerDescription:
    'Use your own provider credentials. Source excerpt mode in the studio also works without an AI provider.',
  openaiKeyStep: 'Create an OpenAI API key',
  openaiApiKeys: 'Open OpenAI API keys',
  openaiAuthDocs: 'Read API authentication guidance',
  openaiBilling:
    'ChatGPT subscriptions and API billing are separate. Signing in to ChatGPT or Codex does not connect Open Notebook to the API.',
  saveKeyStep: 'Add a provider configuration',
  saveKeyDescription:
    'Choose OpenAI below, name the configuration, and enter the API key. Keys are encrypted on the server; model requests run through that server.',
  configureOpenAI: 'Configure OpenAI',
  testStep: 'Test the connection and discover models',
  testDescription:
    'Use Test connection, then Discover models on the saved configuration. Select the models you need and register them. Model tests and generation can incur provider charges.',
  defaultsStep: 'Choose your default models',
  defaultsDescription:
    'Assign a language model for chat and creation. Assign an embedding model for semantic search. Review each choice before saving.',
  chooseDefaults: 'Go to default models',
  encryptionPending:
    'Checking server encryption before credentials can be added.',
  encryptionError:
    'Server encryption status could not be checked. Retry before adding credentials.',
  providerLoadError:
    'Some provider settings could not be loaded. Retry to refresh configurations, models, and defaults.',
  openaiFormHint:
    'Use an API key from your OpenAI project. ChatGPT or Codex sign-in is not an API credential for this app.'
}

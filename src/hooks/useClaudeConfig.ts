import { useLocalStorage } from './useLocalStorage';
import type { ClaudeConfig } from '../lib/claude';

const DEFAULT: ClaudeConfig = {
  apiKey: '',
  model: 'claude-sonnet-4-6',
};

export function useClaudeConfig() {
  const [config, setConfig] = useLocalStorage<ClaudeConfig>('kam-claude-config', DEFAULT);

  function update(patch: Partial<ClaudeConfig>) {
    setConfig(prev => ({ ...prev, ...patch }));
  }

  return {
    config,
    update,
    isConfigured: Boolean(config.apiKey.trim()),
  };
}

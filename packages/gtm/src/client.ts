import {
  createAccessTokenProvider,
  type ServiceAccountCredentials,
} from './auth.js';

const BASE_URL = 'https://tagmanager.googleapis.com/tagmanager/v2';

export const GTM_SCOPES = [
  'https://www.googleapis.com/auth/tagmanager.readonly',
  'https://www.googleapis.com/auth/tagmanager.edit.containers',
  'https://www.googleapis.com/auth/tagmanager.manage.accounts',
];

export interface GtmClientConfig extends ServiceAccountCredentials {
  /** Default GTM account to use. When unset, the first account is used. */
  accountId?: string;
  baseUrl?: string;
}

export interface GtmAccount {
  path: string;
  accountId: string;
  name: string;
}

export interface GtmContainer {
  path: string;
  accountId: string;
  containerId: string;
  name: string;
  publicId?: string;
  usageContext?: string[];
  domainName?: string[];
  taggingServerUrls?: string[];
}

export interface CreateServerContainerInput {
  accountId: string;
  name: string;
  domainName?: string[];
  taggingServerUrls?: string[];
}

export class GtmApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = 'GtmApiError';
  }
}

export interface GtmClient {
  listAccounts(): Promise<GtmAccount[]>;
  createAccount(name: string): Promise<GtmAccount>;
  resolveAccountId(): Promise<string>;
  listContainers(accountId: string): Promise<GtmContainer[]>;
  createServerContainer(input: CreateServerContainerInput): Promise<GtmContainer>;
  getContainerSnippet(accountId: string, containerId: string): Promise<{
    snippet?: string;
    containerConfig?: string;
  }>;
  getContainerConfig(accountId: string, containerId: string): Promise<string>;
  deleteContainer(accountId: string, containerId: string): Promise<void>;
}

export function createGtmClient(config: GtmClientConfig): GtmClient {
  const tokens = createAccessTokenProvider(config, GTM_SCOPES);
  const baseUrl = config.baseUrl ?? BASE_URL;

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await tokens.getAccessToken();
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new GtmApiError(
        `GTM API ${method} ${path} failed (${response.status})`,
        response.status,
        text,
      );
    }

    return (text ? JSON.parse(text) : undefined) as T;
  }

  return {
    async listAccounts() {
      const data = await request<{ account?: GtmAccount[] }>('GET', '/accounts');
      return data.account ?? [];
    },

    async createAccount(name) {
      return request<GtmAccount>('POST', '/accounts', { name });
    },

    async resolveAccountId() {
      if (config.accountId) return config.accountId;
      const accounts = await this.listAccounts();
      const account = accounts[0];
      if (!account) {
        throw new Error('No GTM account available. Set GTM_ACCOUNT_ID or create an account.');
      }
      return account.accountId;
    },

    async listContainers(accountId) {
      const data = await request<{ container?: GtmContainer[] }>(
        'GET',
        `/accounts/${encodeURIComponent(accountId)}/containers`,
      );
      return data.container ?? [];
    },

    async createServerContainer(input) {
      return request<GtmContainer>(
        'POST',
        `/accounts/${encodeURIComponent(input.accountId)}/containers`,
        {
          name: input.name,
          usageContext: ['server'],
          ...(input.domainName ? { domainName: input.domainName } : {}),
          ...(input.taggingServerUrls ? { taggingServerUrls: input.taggingServerUrls } : {}),
        },
      );
    },

    async getContainerSnippet(accountId, containerId) {
      return request<{ snippet?: string; containerConfig?: string }>(
        'GET',
        `/accounts/${encodeURIComponent(accountId)}/containers/${encodeURIComponent(containerId)}:snippet`,
      );
    },

    async getContainerConfig(accountId, containerId) {
      const { containerConfig } = await this.getContainerSnippet(accountId, containerId);
      if (!containerConfig) {
        throw new Error(
          `GTM container ${containerId} did not return a server container config`,
        );
      }
      return containerConfig;
    },

    async deleteContainer(accountId, containerId) {
      await request<void>(
        'DELETE',
        `/accounts/${encodeURIComponent(accountId)}/containers/${encodeURIComponent(containerId)}`,
      );
    },
  };
}

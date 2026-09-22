/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
    interface Error {
      message: string;
    }
    interface Locals {
      user?: {
        id: string;
        email: string;
        name?: string;
      };
      organizationId?: string;
    }
    interface PageData {
      title?: string;
    }
  }
}

export {};

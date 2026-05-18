"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/types";
import { UserProvider } from "./auth/user-provider";

interface ProvidersProps {
  children: ReactNode;
  initialUser?: User | null;
  initialProfile?: Profile | null;
}

/**
 * Client-side providers. TanStack Query handles all `/api/*` calls;
 * UserProvider keeps the auth state in sync.
 */
export function Providers({ children, initialUser = null, initialProfile = null }: ProvidersProps) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <UserProvider initialUser={initialUser} initialProfile={initialProfile}>
        {children}
      </UserProvider>
    </QueryClientProvider>
  );
}

/* ----------------------------------------------------- typed fetch client */

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

interface ApiSuccess<T> {
  data: T;
}

interface ApiFailure {
  error: string;
}

export async function apiGet<T>(
  path: string,
  init?: { signal?: AbortSignal },
): Promise<T> {
  const res = await fetch(path, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: init?.signal,
  });
  const json = (await res.json().catch(() => null)) as ApiSuccess<T> | ApiFailure | null;
  if (!res.ok) {
    const message = json && "error" in json ? json.error : `HTTP ${res.status}`;
    throw new ApiError(res.status, message);
  }
  if (!json || !("data" in json)) {
    throw new ApiError(500, "Malformed response");
  }
  return json.data;
}

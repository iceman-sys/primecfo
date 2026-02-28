"use client";

import React, { createContext, useContext } from "react";
import type { Client } from "@/lib/financialData";

interface ClientContextType {
  clients: Client[];
  selectedClient: Client | null;
  setSelectedClient: (c: Client | null) => void;
  isLoading: boolean;
}

const ClientContext = createContext<ClientContextType>({
  clients: [],
  selectedClient: null,
  setSelectedClient: () => {},
  isLoading: false,
});

export const useClientContext = () => useContext(ClientContext);

export const ClientProvider = ClientContext.Provider;

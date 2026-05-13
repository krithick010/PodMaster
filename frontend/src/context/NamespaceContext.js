import React, { createContext, useContext, useState } from "react";

const NamespaceContext = createContext();

export function NamespaceProvider({ children }) {
  const [selectedNamespace, setSelectedNamespace] = useState("all");

  return React.createElement(
    NamespaceContext.Provider,
    { value: { selectedNamespace, setSelectedNamespace } },
    children
  );
}

export function useNamespaceContext() {
  const context = useContext(NamespaceContext);
  if (!context) {
    throw new Error(
      "useNamespaceContext must be used within NamespaceProvider"
    );
  }
  return context;
}

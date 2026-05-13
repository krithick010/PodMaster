import { useState, useEffect } from "react";
import axios from "axios";

export function useNamespace() {
  const [namespaces, setNamespaces] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNamespaces = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/namespaces");
        setNamespaces(response.data.namespaces || []);
      } catch (err) {
        console.error("Error fetching namespaces:", err);
        // Fallback to demo namespaces
        setNamespaces([
          "university-frontend",
          "university-backend",
          "university-data",
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchNamespaces();
  }, []);

  return {
    namespaces,
    selectedNamespace,
    setSelectedNamespace,
    loading,
  };
}

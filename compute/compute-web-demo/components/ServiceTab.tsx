
import { useState, useEffect } from 'react';

interface ServiceTabProps {
  broker: any;
  selectedProvider: any;
  setSelectedProvider: (provider: any) => void;
  message: string;
  setMessage: (message: string) => void;
}

export default function ServiceTab({ 
  broker, 
  selectedProvider, 
  setSelectedProvider, 
  message, 
  setMessage 
}: ServiceTabProps) {

  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取服务列表
  const fetchProviders = async () => {
    if (!broker) return;

    setLoading(true);
    try {
      const services = await broker.inference.listService();
      const list = services.map((s: any) => ({
        address: s.provider || "",
        name: s.name || s.model || "Unknown",
        model: s.model || "Unknown",
      }));
      setProviders(list);
      if (list.length > 0 && !selectedProvider) {
        setSelectedProvider(list[0]);
      }
    } catch (err) {
      console.error("获取服务失败:", err);
    }
    setLoading(false);
  };

  // 自动获取服务列表
  useEffect(() => {
    fetchProviders();
  }, [broker]);

  // 验证服务
  const verifyService = async () => {
    if (!broker || !selectedProvider) return;

    setLoading(true);
    try {
      await broker.inference.acknowledgeProviderSigner(selectedProvider.address);
      setMessage("服务验证成功");
    } catch (err) {
      console.error("服务验证失败:", err);
      setMessage("服务验证失败");
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>服务列表</h2>
      {providers.length > 0 ? (
        <div>
          <select
            value={selectedProvider?.address || ""}
            onChange={(e) => {
              const p = providers.find((p) => p.address === e.target.value);
              setSelectedProvider(p);
            }}
            style={{
              padding: "5px",
              width: "100%",
              marginBottom: "10px",
            }}
          >
            {providers.map((p) => (
              <option key={p.address} value={p.address}>
                {p.name} - {p.model}
              </option>
            ))}
          </select>

          {selectedProvider && (
            <div>
              <p>地址: {selectedProvider.address}</p>
              <button
                onClick={verifyService}
                disabled={loading}
                style={{ padding: "5px 15px", marginTop: "10px" }}
              >
                {loading ? "验证中..." : "验证服务"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <p>加载中...</p>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';

interface AccountTabProps {
  broker: any;
  message: string;
  setMessage: (message: string) => void;
}

export default function AccountTab({ broker, message, setMessage }: AccountTabProps) {

  const [balance, setBalance] = useState<{
    total: number;
    available: number;
  } | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // 获取余额
  const fetchBalance = async () => {
    if (!broker) return;

    try {
      const { ledgerInfo } = await broker.ledger.ledger.getLedgerWithDetail();
      const total = Number(ledgerInfo[0]) / 1e18;
      const locked = Number(ledgerInfo[1]) / 1e18;
      setBalance({ total, available: total - locked });
    } catch {
      setBalance(null);
    }
  };

  // 充值
  const handleDeposit = async () => {
    if (!broker || !depositAmount) return;

    setLoading(true);
    try {
      const amount = parseFloat(depositAmount);

      // 检查是否有账本
      let hasLedger = false;
      try {
        await broker.ledger.ledger.getLedgerWithDetail();
        hasLedger = true;
      } catch {}

      if (hasLedger) {
        await broker.ledger.depositFund(amount);
      } else {
        await broker.ledger.addLedger(amount);
      }

      setMessage(`充值 ${amount} A0GI 成功`);
      setDepositAmount("");
      await fetchBalance();
    } catch (err) {
      setMessage("充值失败");
    }
    setLoading(false);
  };

  // 自动获取余额
  useEffect(() => {
    fetchBalance();
  }, [broker]);

  
  
  return (
    <div>
      <h2>账户余额</h2>
      {balance ? (
        <p>
          余额: {balance.available.toFixed(4)} A0GI (总计:{" "}
          {balance.total.toFixed(4)})
        </p>
      ) : (
        <p>暂无账本</p>
      )}

      <div style={{ marginTop: "20px" }}>
        <input
          type="number"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          placeholder="充值金额"
          style={{ padding: "5px", marginRight: "10px" }}
        />
        <button
          onClick={handleDeposit}
          disabled={loading}
          style={{ padding: "5px 15px" }}
        >
          {loading ? "处理中..." : "充值"}
        </button>
      </div>
    </div>
  );
}
import fetch from 'node-fetch';

const base = 'http://127.0.0.1:3000';

(async () => {
  try {
    const regRes = await fetch(base + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'cleartest2@example.com', password: 'ClearPass!23', fullName: 'Clear Runner' }),
    });
    const reg = await regRes.json();
    console.log('REGISTER', JSON.stringify(reg));
    if (!reg.token) throw new Error('register failed');
    const token = reg.token;

    const accRes = await fetch(base + '/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ platformName: 'ClearRail', accountName: 'Clear Account JS', accountType: 'WALLET', accountIdentifier: 'clear_js_01', initialBalance: 200 }),
    });
    const acc = await accRes.json();
    console.log('ACCOUNT', JSON.stringify(acc));
    const accountId = acc.id || acc._id;

    const txRes = await fetch(base + '/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ destinationAccountId: accountId, type: 'INFLOW', grossAmount: 1000, feeAmount: 10, currency: 'USD' }),
    });
    const tx = await txRes.json();
    console.log('TX_CREATED', JSON.stringify(tx));
    const txId = tx.id;

    const updRes = await fetch(`${base}/api/transactions/${txId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ status: 'CLEARED' }),
    });
    const upd = await updRes.json();
    console.log('TX_UPDATED', JSON.stringify(upd));

    const accountsRes = await fetch(base + '/api/accounts', { headers: { Authorization: 'Bearer ' + token } });
    const accounts = await accountsRes.json();
    console.log('ACCOUNTS_AFTER', JSON.stringify(accounts));
  } catch (e) {
    console.error('ERROR', e.message || e);
    process.exit(1);
  }
})();

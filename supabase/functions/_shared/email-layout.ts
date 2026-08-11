export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

interface EmailLayoutInput {
  preheader: string
  label: string
  title: string
  intro: string
  content: string
  footer: string
  logoUrl?: string
}

export function detailRows(rows: Array<[string, string]>) {
  return rows.map(([label, value], index) => `
    <tr>
      <td style="padding:13px 0;${index < rows.length - 1 ? ' border-bottom:1px solid #dbe3f2;' : ''} color:#52627d; font-size:12px; letter-spacing:.3px;">${escapeHtml(label)}</td>
      <td style="padding:13px 0;${index < rows.length - 1 ? ' border-bottom:1px solid #dbe3f2;' : ''} color:#071f52; font-size:13px; font-weight:700; text-align:right;">${escapeHtml(value)}</td>
    </tr>`).join('')
}

export function renderEmailLayout(input: EmailLayoutInput) {
  const logo = input.logoUrl
    ? `<img src="${escapeHtml(input.logoUrl)}" alt="Katada Van Rentals" width="72" height="72" style="display:block; width:72px; height:72px; object-fit:contain; background:#ffffff;">`
    : `<div style="width:72px; height:72px; background:#e92935; color:#ffd923; font-size:42px; line-height:72px; font-weight:900; text-align:center;">K</div>`

  return `<div style="margin:0; padding:28px 12px; background:#f7f9ff; font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif; color:#071f52;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(input.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px; margin:0 auto; background:#ffffff; border:1px solid #dbe3f2;">
    <tr><td style="height:8px; padding:0; background:#e92935; font-size:0; line-height:0;">&nbsp;</td></tr>
    <tr><td style="padding:24px 30px; background:#071f52;">
      <table role="presentation" cellspacing="0" cellpadding="0"><tr>
        <td style="vertical-align:middle;">${logo}</td>
        <td style="padding-left:16px; color:#ffffff; font-size:16px; font-weight:800; letter-spacing:1.5px;">KATADA<br><span style="color:#ffd923; font-size:10px; letter-spacing:2.5px;">VAN RENTALS</span>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:34px 30px 8px;">
      <div style="color:#e92935; font-size:11px; font-weight:800; letter-spacing:2px; text-transform:uppercase;">${escapeHtml(input.label)}</div>
      <h1 style="margin:12px 0 10px; color:#071f52; font-size:30px; line-height:1.12; font-weight:800; letter-spacing:-.5px;">${input.title}</h1>
      <p style="margin:0; color:#52627d; font-size:14px; line-height:1.7;">${input.intro}</p>
    </td></tr>
    <tr><td style="padding:22px 30px 30px;">${input.content}</td></tr>
    <tr><td style="padding:20px 30px; border-top:1px solid #dbe3f2; background:#f7f9ff; color:#52627d; font-size:12px; line-height:1.7;">${input.footer}</td></tr>
    <tr><td style="padding:18px 30px 22px; background:#071f52; color:#ffffff; font-size:11px; line-height:1.7;">
      <strong style="color:#ffd923; letter-spacing:1px;">KATADA VAN RENTALS</strong><br>
      Reliable vans for the road ahead.
    </td></tr>
  </table>
</div>`
}

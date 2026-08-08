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
}

export function detailRows(rows: Array<[string, string]>) {
  return rows.map(([label, value], index) => `
    <tr>
      <td style="padding:13px 0;${index < rows.length - 1 ? ' border-bottom:1px solid #d8d3c7;' : ''} color:#716d65; font-size:12px; letter-spacing:.3px;">${escapeHtml(label)}</td>
      <td style="padding:13px 0;${index < rows.length - 1 ? ' border-bottom:1px solid #d8d3c7;' : ''} color:#101c32; font-size:13px; font-weight:700; text-align:right;">${escapeHtml(value)}</td>
    </tr>`).join('')
}

export function renderEmailLayout(input: EmailLayoutInput) {
  return `<div style="margin:0; padding:28px 12px; background:#e9e7df; font-family:Arial,Helvetica,sans-serif; color:#101c32;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(input.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px; margin:0 auto; background:#ffffff; border:1px solid #d8d3c7;">
    <tr><td style="height:6px; padding:0; background:#f4c51f; font-size:0; line-height:0;">&nbsp;</td></tr>
    <tr><td style="padding:25px 30px 27px; background:#101c32;">
      <table role="presentation" cellspacing="0" cellpadding="0"><tr>
        <td style="width:34px; height:34px; background:#e92935; color:#f4c51f; font-size:24px; line-height:34px; font-weight:900; text-align:center;">K</td>
        <td style="padding-left:12px; color:#ffffff; font-size:14px; font-weight:800; letter-spacing:2px;">KATADA<br><span style="color:#f4c51f; font-size:10px; letter-spacing:3px;">VAN RENTALS</span></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:34px 30px 8px;">
      <div style="color:#e92935; font-size:11px; font-weight:800; letter-spacing:2px; text-transform:uppercase;">${escapeHtml(input.label)}</div>
      <h1 style="margin:12px 0 10px; color:#101c32; font-family:Georgia,'Times New Roman',serif; font-size:30px; line-height:1.12; font-weight:400; letter-spacing:-.5px;">${input.title}</h1>
      <p style="margin:0; color:#5f5b54; font-size:14px; line-height:1.7;">${input.intro}</p>
    </td></tr>
    <tr><td style="padding:22px 30px 30px;">${input.content}</td></tr>
    <tr><td style="padding:20px 30px; border-top:1px solid #d8d3c7; background:#f5f2ea; color:#5f5b54; font-size:12px; line-height:1.7;">${input.footer}</td></tr>
    <tr><td style="padding:18px 30px 22px; background:#101c32; color:#ffffff; font-size:11px; line-height:1.7;">
      <strong style="color:#f4c51f; letter-spacing:1px;">KATADA VAN RENTALS</strong><br>
      Reliable vans for the road ahead.
    </td></tr>
  </table>
</div>`
}

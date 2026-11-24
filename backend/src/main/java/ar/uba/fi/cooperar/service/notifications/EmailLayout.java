package ar.uba.fi.cooperar.service.notifications;

import java.util.List;
import org.springframework.web.util.HtmlUtils;

/** The look shared by the emails: a branded header, the text, an optional quote, and a button to the place to go. */
final class EmailLayout {

    private static final String BRAND = "#1b5e9b";

    private EmailLayout() {}

    /**
     * @param logoUrl the logo, served by the frontend
     * @param greeting the first line, like "Hola, Ana:"
     * @param paragraphs the text, one paragraph each
     * @param quote what the observatory said, shown apart; may be null
     * @param buttonLabel what the button says
     * @param url where the button leads
     * @param footer a closing line in small print; may be null
     */
    static String html(
            String logoUrl,
            String greeting,
            List<String> paragraphs,
            String quote,
            String buttonLabel,
            String url,
            String footer) {
        StringBuilder body = new StringBuilder();
        body.append("<p style=\"margin:0 0 16px;font-size:16px;font-weight:600;\">")
                .append(escape(greeting))
                .append("</p>");
        paragraphs.forEach(paragraph -> body.append("<p style=\"margin:0 0 16px;\">")
                .append(escape(paragraph))
                .append("</p>"));
        if (quote != null) {
            body.append("<blockquote style=\"margin:0 0 20px;padding:12px 16px;background:#eaf3fb;"
                            + "border-left:4px solid " + BRAND + ";"
                            + "border-radius:4px;color:#0e3558;\">")
                    .append(escape(quote).replace("\n", "<br>"))
                    .append("</blockquote>");
        }
        body.append("<p style=\"margin:24px 0;\"><a href=\"")
                .append(escape(url))
                .append("\" style=\"display:inline-block;padding:12px 24px;background:" + BRAND + ";color:#ffffff;"
                        + "text-decoration:none;font-weight:600;border-radius:8px;\">")
                .append(escape(buttonLabel))
                .append("</a></p>")
                .append("<p style=\"margin:0;font-size:13px;color:#5c6670;\">Si el botón no funciona, copiá este "
                        + "enlace en tu navegador:<br><a href=\"")
                .append(escape(url))
                .append("\" style=\"color:" + BRAND + ";word-break:break-all;\">")
                .append(escape(url))
                .append("</a></p>");
        if (footer != null) {
            body.append("<p style=\"margin:16px 0 0;font-size:13px;color:#5c6670;\">")
                    .append(escape(footer))
                    .append("</p>");
        }
        return """
                <!DOCTYPE html>
                <html lang="es">
                <body style="margin:0;padding:24px 12px;background:#f4f7fb;\
                font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1f2933;line-height:1.5;">
                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:560px;\
                margin:0 auto;background:#ffffff;border:1px solid #dde5ee;border-radius:12px;overflow:hidden;">
                <tr><td style="padding:18px 28px;border-bottom:3px solid %s;">\
                <img src="%s" alt="" height="34" style="vertical-align:middle;height:34px;border:0;">\
                <span style="vertical-align:middle;margin-left:10px;font-size:22px;color:#0e3558;\
                letter-spacing:.2px;">cooper<b>AR</b></span></td></tr>
                <tr><td style="padding:28px;font-size:15px;">%s</td></tr>
                </table>
                <p style="max-width:560px;margin:16px auto 0;text-align:center;font-size:12px;color:#8592a0;">\
                Observatorio digital de empresas recuperadas y cooperativas de trabajo</p>
                </body>
                </html>
                """.formatted(BRAND, escape(logoUrl), body);
    }

    private static String escape(String text) {
        return HtmlUtils.htmlEscape(text, "UTF-8");
    }
}

package ar.uba.fi.cooperar.service.notifications;

import java.util.List;

/** A piece of the body of an email, between the greeting and the button. Each one renders as HTML and as plain text. */
sealed interface EmailBlock {

    /** A paragraph; some of its parts can be links. */
    record Paragraph(List<Part> parts) implements EmailBlock {

        Paragraph(String text) {
            this(List.of(new Text(text)));
        }
    }

    /** Labeled values, one per line, like the contact data of whoever asked. */
    record Details(List<Detail> details) implements EmailBlock {}

    /** What someone wrote, shown apart. */
    record Quote(String text) implements EmailBlock {}

    /** A note nobody should miss, in a box. */
    record Highlight(String text) implements EmailBlock {}

    sealed interface Part {}

    record Text(String text) implements Part {}

    record Link(String text, String url) implements Part {}

    record Detail(String label, String value) {}
}

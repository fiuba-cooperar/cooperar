package ar.uba.fi.cooperar.repository.inquiries;

import ar.uba.fi.cooperar.domain.inquiries.Inquiry;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InquiryRepository extends JpaRepository<Inquiry, UUID> {}

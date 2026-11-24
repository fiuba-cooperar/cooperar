package ar.uba.fi.cooperar.domain.organizations;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.time.LocalTime;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/** A range of hours in which an organization is open on a day (or on public holidays). A day can have more than one. */
@Embeddable
public record OpeningPeriod(
        @Enumerated(EnumType.STRING) @Column(name = "day_of_week", nullable = false)
        OpeningDay day,

        @Column(name = "opens_at", nullable = false) LocalTime opensAt,
        @Column(name = "closes_at", nullable = false) LocalTime closesAt) {

    /** Where a day that never closes ends, which is how "open 24 hours" is written. */
    public static final LocalTime END_OF_DAY = LocalTime.of(23, 59);

    public static final Comparator<OpeningPeriod> CHRONOLOGICAL =
            Comparator.comparing(OpeningPeriod::day).thenComparing(OpeningPeriod::opensAt);

    public OpeningPeriod {
        Objects.requireNonNull(day, "day");
        Objects.requireNonNull(opensAt, "opensAt");
        Objects.requireNonNull(closesAt, "closesAt");
        if (!onTheQuarterHour(opensAt) || !(onTheQuarterHour(closesAt) || END_OF_DAY.equals(closesAt))) {
            throw new InvalidOpeningHoursException("Hours are set in steps of 15 minutes");
        }
        if (!opensAt.isBefore(closesAt)) {
            throw new InvalidOpeningHoursException("A range has to close after it opens");
        }
    }

    /** The ranges of the same day must not overlap, or the schedule would say two things about the same hour. */
    public static List<OpeningPeriod> requireNoOverlap(Collection<OpeningPeriod> periods) {
        List<OpeningPeriod> sorted = periods.stream().sorted(CHRONOLOGICAL).toList();
        for (int i = 1; i < sorted.size(); i++) {
            OpeningPeriod previous = sorted.get(i - 1);
            OpeningPeriod current = sorted.get(i);
            if (previous.day() == current.day() && current.opensAt().isBefore(previous.closesAt())) {
                throw new InvalidOpeningHoursException("The ranges of " + current.day() + " overlap");
            }
        }
        return sorted;
    }

    private static boolean onTheQuarterHour(LocalTime time) {
        return time.getMinute() % 15 == 0 && time.getSecond() == 0 && time.getNano() == 0;
    }
}

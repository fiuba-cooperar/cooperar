package ar.uba.fi.cooperar.repository.organizations;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.EnumSet;

/** Reads the enum names that a query gathers with {@code array(SELECT ...)}. */
final class SqlArrays {

    private SqlArrays() {}

    static <E extends Enum<E>> EnumSet<E> enums(ResultSet row, String column, Class<E> type) throws SQLException {
        EnumSet<E> values = EnumSet.noneOf(type);
        Array array = row.getArray(column);
        for (Object name : (Object[]) array.getArray()) {
            values.add(Enum.valueOf(type, (String) name));
        }
        return values;
    }
}

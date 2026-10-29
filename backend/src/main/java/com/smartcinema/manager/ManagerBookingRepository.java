package com.smartcinema.manager;

import java.sql.*;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.stereotype.Repository;
import static com.smartcinema.manager.ManagerBookingResponse.*;

@Repository
public class ManagerBookingRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public ManagerBookingRepository(NamedParameterJdbcTemplate jdbc){this.jdbc=jdbc;}
    static final String FROM="""
        FROM bookings b JOIN showtimes st ON st.id=b.showtime_id
        JOIN halls h ON h.id=st.hall_id JOIN cinemas c ON c.id=h.cinema_id
        JOIN movies m ON m.id=st.movie_id
        """;
    static final String SCOPE=ManagerScope.predicate("c.id");
    static final String STATUS="CASE WHEN b.status='PENDING' AND b.expires_at<=:now THEN 'EXPIRED' ELSE b.status END";
    static final String LATEST="""
        LEFT JOIN LATERAL (SELECT p.id payment_id,p.status payment_status,p.amount payment_amount,
          p.currency,p.provider,p.initiated_at,p.completed_at,p.reconciliation_required
          FROM payment_transactions p WHERE p.booking_id=b.id ORDER BY p.initiated_at DESC,p.id DESC LIMIT 1) lp ON true
        """;
    static final String SELECT="""
        SELECT b.id,b.booking_code,b.status stored_status,b.created_at,b.expires_at,b.payment_started_at,b.paid_at,
          b.seat_amount,b.concession_amount,b.subtotal,b.discount,b.final_amount,
          st.id showtime_id,st.start_time,st.movie_id,m.title,st.hall_id,h.name hall_name,c.id cinema_id,c.name cinema_name,
          (SELECT count(*) FROM booking_seats bs WHERE bs.booking_id=b.id) seat_count,
          (SELECT coalesce(sum(CASE WHEN bs.seat_type_snapshot='COUPLE' THEN 2 ELSE 1 END),0) FROM booking_seats bs WHERE bs.booking_id=b.id) guest_count,
          (SELECT count(*) FROM tickets t JOIN booking_seats bs ON bs.id=t.booking_seat_id WHERE bs.booking_id=b.id) ticket_count,
          lp.*,
        """+STATUS+" effective_status "+FROM+LATEST;
    private record Filter(String sql,MapSqlParameterSource parameters){ }
    private static Filter filter(long actor,ManagerBookingQuery q,Instant now){
        var p=new MapSqlParameterSource("actor",actor).addValue("now",Timestamp.from(now)).addValue("limit",q.size()).addValue("offset",q.offset());
        var sql=new StringBuilder(" WHERE ").append(SCOPE);
        add(sql,p,"c.id","cinema",q.cinemaId());add(sql,p,"st.id","showtime",q.showtimeId());add(sql,p,"b.id","booking",q.bookingId());
        add(sql,p,"b.booking_code","code",q.bookingCode());add(sql,p,STATUS,"status",q.status());add(sql,p,"lp.payment_status","payment",q.paymentStatus());
        if(q.createdFrom()!=null){sql.append(" AND b.created_at>=:from");p.addValue("from",Timestamp.from(q.createdFrom()));}
        if(q.createdTo()!=null){sql.append(" AND b.created_at<:to");p.addValue("to",Timestamp.from(q.createdTo()));}
        return new Filter(sql.toString(),p);
    }
    private static void add(StringBuilder sql,MapSqlParameterSource p,String column,String key,Object value){if(value!=null){sql.append(" AND ").append(column).append("=:").append(key);p.addValue(key,value);}}
    public Page list(long actor,ManagerBookingQuery q,Instant now){
        var f=filter(actor,q,now);
        long total=jdbc.queryForObject("SELECT count(*) "+FROM+LATEST+f.sql(),f.parameters(),Long.class);
        var items=jdbc.query(SELECT+f.sql()+" ORDER BY b.created_at DESC,b.id ASC LIMIT :limit OFFSET :offset",f.parameters(),(r,n)->item(r));
        return new Page(items,q.page(),q.size(),total,total/q.size()+(total%q.size()==0?0:1),now);
    }
    public Detail detail(long actor,long booking,Instant now){
        var p=new MapSqlParameterSource("actor",actor).addValue("id",booking).addValue("now",Timestamp.from(now));
        var main=jdbc.query(SELECT+" WHERE b.id=:id AND "+SCOPE,p,(r,n)->new Detail(item(r),
                new Amounts(money(r,"seat_amount"),money(r,"concession_amount"),money(r,"subtotal"),money(r,"discount"),money(r,"final_amount")),List.of(),List.of(),List.of(),List.of(),now));
        if(main.isEmpty())throw new ManagerFailure(404);
        var head=main.getFirst();
        var seats=jdbc.query("SELECT bs.id,bs.seat_id,s.row,s.number,bs.seat_type_snapshot,bs.unit_price_snapshot,bs.final_price "+FROM+
                " JOIN booking_seats bs ON bs.booking_id=b.id JOIN seats s ON s.id=bs.seat_id WHERE b.id=:id AND "+SCOPE+" ORDER BY bs.id",p,
                (r,n)->new Seat(r.getString("id"),r.getString("seat_id"),r.getString("row"),r.getString("number"),r.getString("seat_type_snapshot"),
                    "COUPLE".equals(r.getString("seat_type_snapshot"))?2:1,money(r,"unit_price_snapshot"),money(r,"final_price")));
        var concessions=jdbc.query("SELECT bc.id,bc.concession_item_id,bc.item_name_snapshot,bc.category_snapshot,bc.quantity,bc.unit_price_snapshot,bc.total_price "+FROM+
                " JOIN booking_concessions bc ON bc.booking_id=b.id WHERE b.id=:id AND "+SCOPE+" ORDER BY bc.id",p,
                (r,n)->new Concession(r.getString("id"),r.getString("concession_item_id"),r.getString("item_name_snapshot"),r.getString("category_snapshot"),r.getInt("quantity"),money(r,"unit_price_snapshot"),money(r,"total_price")));
        var payments=jdbc.query("SELECT pt.id payment_id,pt.status payment_status,pt.amount payment_amount,pt.currency,pt.provider,pt.initiated_at,pt.completed_at,pt.reconciliation_required "+FROM+
                " JOIN payment_transactions pt ON pt.booking_id=b.id WHERE b.id=:id AND "+SCOPE+" ORDER BY pt.initiated_at DESC,pt.id DESC",p,(r,n)->payment(r));
        var tickets=jdbc.query("SELECT t.id,t.booking_seat_id,bs.seat_id,t.status,t.issued_at,t.checked_in_at "+FROM+
                " JOIN booking_seats bs ON bs.booking_id=b.id JOIN tickets t ON t.booking_seat_id=bs.id WHERE b.id=:id AND "+SCOPE+" ORDER BY t.id",p,
                (r,n)->new Ticket(r.getString("id"),r.getString("booking_seat_id"),r.getString("seat_id"),r.getString("status"),instant(r,"issued_at"),instant(r,"checked_in_at")));
        return new Detail(head.booking(),head.amounts(),seats,concessions,payments,tickets,now);
    }
    static Item item(ResultSet r)throws SQLException{return new Item(r.getString("id"),r.getString("booking_code"),r.getString("effective_status"),r.getString("stored_status"),
            r.getString("cinema_id"),r.getString("cinema_name"),r.getString("hall_id"),r.getString("hall_name"),r.getString("movie_id"),r.getString("title"),r.getString("showtime_id"),
            instant(r,"start_time"),instant(r,"created_at"),instant(r,"expires_at"),instant(r,"payment_started_at"),instant(r,"paid_at"),
            r.getInt("seat_count"),r.getInt("guest_count"),r.getInt("ticket_count"),money(r,"final_amount"),payment(r));}
    private static Payment payment(ResultSet r)throws SQLException{return r.getString("payment_id")==null?null:new Payment(r.getString("payment_id"),r.getString("payment_status"),money(r,"payment_amount"),r.getString("currency"),r.getString("provider"),instant(r,"initiated_at"),instant(r,"completed_at"),r.getBoolean("reconciliation_required"));}
    private static String money(ResultSet r,String key)throws SQLException{return r.getBigDecimal(key).toPlainString();}
    private static Instant instant(ResultSet r,String key)throws SQLException{var t=r.getTimestamp(key);return t==null?null:t.toInstant();}
}

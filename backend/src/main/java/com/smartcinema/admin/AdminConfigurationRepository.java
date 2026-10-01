package com.smartcinema.admin;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;

@Repository
public class AdminConfigurationRepository {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public AdminConfigurationRepository(JdbcTemplate jdbc,ObjectMapper json) { this.jdbc=jdbc; this.json=json; }
    public record Cinema(String id,String name,String address,String contact,String operatingInformation,String status) {}
    public record Hall(String id,String cinemaId,String name,int capacity,String type,String status,boolean layoutInitialized) {}
    public record Seat(String id,String hallId,String row,String number,String type,String physicalStatus,int guestCapacity,boolean structureEditable) {}
    public List<Cinema> cinemas() {
        return jdbc.query("SELECT * FROM cinemas ORDER BY id",(r,n)->new Cinema(r.getString("id"),r.getString("name"),r.getString("address"),r.getString("contact"),r.getString("operating_information"),r.getString("status")));
    }
    public Cinema cinema(long id) { return cinemas().stream().filter(item->item.id().equals(Long.toString(id))).findFirst().orElseThrow(AdminConfigurationException::missing); }
    public List<Hall> halls(long cinema) {
        return jdbc.query("SELECT h.*, EXISTS(SELECT 1 FROM seats s WHERE s.hall_id=h.id) initialized FROM halls h WHERE cinema_id=? ORDER BY id",
            (r,n)->new Hall(r.getString("id"),r.getString("cinema_id"),r.getString("name"),r.getInt("capacity"),r.getString("type"),r.getString("status"),r.getBoolean("initialized")),cinema);
    }
    public Hall hall(long id) {
        Long cinema=jdbc.query("SELECT cinema_id FROM halls WHERE id=?",(r,n)->r.getLong(1),id).stream().findFirst().orElseThrow(AdminConfigurationException::missing);
        return halls(cinema).stream().filter(item->item.id().equals(Long.toString(id))).findFirst().orElseThrow(AdminConfigurationException::missing);
    }
    public List<Seat> seats(long hall) {
        return jdbc.query("""
            SELECT s.*, NOT (EXISTS(SELECT 1 FROM showtime_seats ss WHERE ss.seat_id=s.id)
                OR EXISTS(SELECT 1 FROM seat_holds sh WHERE sh.seat_id=s.id)
                OR EXISTS(SELECT 1 FROM booking_seats bs WHERE bs.seat_id=s.id)) editable
            FROM seats s WHERE hall_id=? ORDER BY row,number,id
            """,(r,n)->new Seat(r.getString("id"),r.getString("hall_id"),r.getString("row"),r.getString("number"),r.getString("seat_type"),r.getString("physical_status"),"COUPLE".equals(r.getString("seat_type"))?2:1,r.getBoolean("editable")),hall);
    }
    public Seat seat(long id) {
        Long hall=jdbc.query("SELECT hall_id FROM seats WHERE id=?",(r,n)->r.getLong(1),id).stream().findFirst().orElseThrow(AdminConfigurationException::missing);
        return seats(hall).stream().filter(item->item.id().equals(Long.toString(id))).findFirst().orElseThrow(AdminConfigurationException::missing);
    }
    public long saveCinema(long actor,Long id,AdminConfigurationRequest.Cinema input) {
        return jdbc.queryForObject("SELECT configure_cinema(?,?,?,?,?,?,?)",Long.class,actor,id,input.name(),input.address(),input.contact(),input.operatingInformation(),input.status());
    }
    public long saveHall(long actor,long cinema,Long id,AdminConfigurationRequest.Hall input) {
        return jdbc.queryForObject("SELECT configure_hall(?,?,?,?,?,?,?)",Long.class,actor,cinema,id,input.name(),input.capacity(),input.type(),input.status());
    }
    public void initialize(long actor,long hall,List<AdminConfigurationRequest.Seat> units) {
        jdbc.queryForList("SELECT configure_hall_layout(?,?,?::jsonb)",actor,hall,json.writeValueAsString(units));
    }
    public void saveSeat(long actor,long id,AdminConfigurationRequest.Seat input) {
        jdbc.queryForList("SELECT configure_seat(?,?,?,?,?,?)",actor,id,input.row(),input.number(),input.type(),input.physicalStatus());
    }
}

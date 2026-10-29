package com.smartcinema.manager;

import java.util.Set;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import com.smartcinema.admin.AdminReportFailure;
import com.smartcinema.admin.AdminReportQuery;

/** The existing reporting date/filter rules are reused without changing the ADMIN contract. */
public final class ManagerReportRequest {
    private ManagerReportRequest() { }

    public static AdminReportQuery parse(MultiValueMap<String,String> query, boolean breakdown) {
        return AdminReportQuery.parse(query,breakdown);
    }

    public static AdminReportQuery concessions(MultiValueMap<String,String> query) {
        var allowed=Set.of("from","to","cinemaId","movieId","showtimeId","page","size");
        query.forEach((key,values)->{
            if(!allowed.contains(key)||values==null||values.size()!=1||values.getFirst()==null||values.getFirst().isBlank())
                throw new AdminReportFailure(400,key);
        });
        var core=new LinkedMultiValueMap<>(query);
        core.remove("page"); core.remove("size");
        var base=AdminReportQuery.parse(core,false);
        return new AdminReportQuery(base.from(),base.to(),base.cinemaId(),base.movieId(),base.showtimeId(),null,
                number(query,"page",0,0,Integer.MAX_VALUE),number(query,"size",20,1,100));
    }

    private static int number(MultiValueMap<String,String> query,String key,int fallback,int min,int max) {
        if(!query.containsKey(key))return fallback;
        try {
            String value=query.getFirst(key);
            if(!value.matches("0|[1-9][0-9]{0,9}"))throw new NumberFormatException();
            int result=Integer.parseInt(value);
            if(result<min||result>max)throw new NumberFormatException();
            return result;
        } catch(NumberFormatException failure) { throw new AdminReportFailure(400,key); }
    }
}

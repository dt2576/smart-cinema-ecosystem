import Link from "next/link";

export function AdminHome() {
  return <section className="space-y-6"><div><p className="text-sm uppercase tracking-widest text-accent">Quản trị chuỗi rạp</p><h1 className="mt-2 text-3xl font-bold">Tổng quan</h1><p className="mt-3 text-muted">Quản lý phim và hệ thống rạp → phòng chiếu → ghế.</p></div>
    <Link href="/admin/movies" className="block rounded-xl border border-outline/40 bg-panel p-6 transition hover:bg-panel-high"><h2 className="text-xl font-semibold">Quản lý phim</h2><p className="mt-2 text-muted">Tạo bản nháp, chỉnh sửa thông tin phim và quản lý việc công bố.</p><span className="mt-4 inline-block font-semibold text-accent">Mở danh sách phim →</span></Link>
    <Link href="/admin/cinemas" className="block rounded-xl border border-outline/40 bg-panel p-6 transition hover:bg-panel-high"><h2 className="text-xl font-semibold">Quản lý rạp chiếu phim</h2><p className="mt-2 text-muted">Quản lý thông tin rạp, phòng chiếu và sơ đồ ghế được bảo vệ.</p><span className="mt-4 inline-block font-semibold text-accent">Mở danh sách rạp →</span></Link>
    <Link href="/admin/showtimes" className="block rounded-xl border border-outline/40 bg-panel p-6 transition hover:bg-panel-high"><h2 className="text-xl font-semibold">Quản lý suất chiếu</h2><p className="mt-2 text-muted">Tạo lịch chiếu hợp lệ với đầy đủ ghế và bảo toàn lịch sử giao dịch.</p><span className="mt-4 inline-block font-semibold text-accent">Mở danh sách suất chiếu →</span></Link>
  </section>;
}

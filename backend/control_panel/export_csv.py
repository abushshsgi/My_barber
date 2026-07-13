"""Admin statistika CSV eksport — Excel uchun UTF-8 BOM bilan."""

from __future__ import annotations

import csv

from django.http import HttpResponse

from .platform_analytics import (
    build_bookings_rows,
    build_platform_overview,
    build_revenue_analytics,
    build_wallet_analytics,
)
from .salon_growth import build_salon_platform_analytics
from .user_signups import build_user_signup_analytics


def _new_csv_response(filename: str):
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}.csv"'
    # UTF-8 BOM — Excel kirill/lotin belgilarni to'g'ri o'qishi uchun.
    response.write("\ufeff")
    return response, csv.writer(response)


def _fmt_dt(value: str | None) -> str:
    return (value or "").replace("T", " ")[:19]


def build_csv_response(export_type: str, start_dt, end_dt, request) -> HttpResponse | None:
    suffix = f"{start_dt.date().isoformat()}_{end_dt.date().isoformat()}"

    if export_type == "overview":
        data = build_platform_overview(start_dt, end_dt)
        response, writer = _new_csv_response(f"umumiy_{suffix}")
        writer.writerow(["Ko'rsatkich", "Qiymat"])
        writer.writerow(["Jami mijozlar", data["b2c"]["clients_total"]])
        writer.writerow(["Faol mijozlar", data["b2c"]["active_clients"]])
        writer.writerow(["Jami bronlar", data["b2c"]["total_bookings"]])
        writer.writerow(["Yakunlangan bronlar", data["b2c"]["completed_bookings"]])
        writer.writerow(["Muvaffaqiyat (%)", data["b2c"]["success_rate"]])
        writer.writerow(["GMV (so'm)", data["revenue"]["gmv"]])
        writer.writerow(["Naqd daromad (so'm)", data["revenue"]["cash_total"]])
        writer.writerow(["Onlayn daromad (so'm)", data["revenue"]["online_total"]])
        writer.writerow(["Jami sartaroshlar", data["b2b"]["barbers_total"]])
        writer.writerow(["Jami salonlar", data["b2b"]["salons_total"]])
        writer.writerow(["Kutilayotgan to'lovlar (so'm)", data["b2b"]["pending_payouts"]])
        return response

    if export_type == "revenue":
        granularity = (request.query_params.get("granularity") or "month").strip()
        data = build_revenue_analytics(start_dt, end_dt, granularity)
        response, writer = _new_csv_response(f"daromad_{suffix}")
        writer.writerow(["Davr", "Jami (so'm)", "Naqd (so'm)", "Onlayn (so'm)", "Bronlar"])
        for row in data["series"]:
            writer.writerow([row["label"], row["total"], row["cash"], row["online"], row["count"]])
        return response

    if export_type == "users":
        data = build_user_signup_analytics(recent_limit=500)
        response, writer = _new_csv_response(f"mijozlar_{suffix}")
        writer.writerow(["Ism", "Telefon", "Email", "Usul", "Vaqt"])
        for row in data["recent"]:
            writer.writerow(
                [
                    row["full_name"],
                    row.get("phone") or "",
                    row.get("display_email") or "",
                    row.get("signup_method") or "",
                    _fmt_dt(row.get("date_joined")),
                ]
            )
        return response

    if export_type == "salons":
        data = build_salon_platform_analytics(recent_limit=500)
        response, writer = _new_csv_response(f"salonlar_{suffix}")
        writer.writerow(["Nomi", "Egasi", "Hudud", "Holat", "Manzil", "Vaqt"])
        for row in data["recent"]:
            writer.writerow(
                [
                    row["name"],
                    row.get("owner_name") or "",
                    row.get("region_label") or "",
                    "Chiqarilgan" if row.get("is_published") else "Tekshiruvda",
                    row.get("address") or "",
                    _fmt_dt(row.get("created_at")),
                ]
            )
        return response

    if export_type == "wallet":
        data = build_wallet_analytics(start_dt, end_dt, recent_limit=500)
        response, writer = _new_csv_response(f"hamyon_{suffix}")
        writer.writerow(["Mijoz", "Tur", "Summa (so'm)", "Qoldiq (so'm)", "Manba", "Vaqt"])
        for row in data["recent"]:
            writer.writerow(
                [
                    row["user_name"],
                    row["entry_type"],
                    row["amount"],
                    row["balance_after"],
                    row.get("source") or "",
                    _fmt_dt(row.get("created_at")),
                ]
            )
        return response

    if export_type == "bookings":
        status_value = (request.query_params.get("status") or "").strip()
        payment_method = (request.query_params.get("payment_method") or "").strip()
        rows = build_bookings_rows(
            start_dt, end_dt, status=status_value, payment_method=payment_method
        )
        response, writer = _new_csv_response(f"bronlar_{suffix}")
        writer.writerow(
            [
                "ID",
                "Buyurtma raqami",
                "Mijoz",
                "Sartarosh",
                "Salon",
                "Holat",
                "To'lov usuli",
                "To'lov holati",
                "Narx (so'm)",
                "Vaqt",
            ]
        )
        for b in rows.iterator():
            writer.writerow(
                [
                    b.id,
                    b.order_number or "",
                    getattr(b.customer, "full_name", "") or "",
                    getattr(b.barber, "full_name", "") or "",
                    getattr(b.salon, "name", "") or "",
                    b.get_status_display(),
                    b.get_payment_method_display(),
                    b.get_payment_status_display(),
                    b.total_price,
                    _fmt_dt(b.start_at.isoformat() if b.start_at else None),
                ]
            )
        return response

    return None

"""Admin Baza — ekotizim qidiruvi, statistika va eksport."""

from __future__ import annotations

import csv
import json
from io import StringIO

from django.http import HttpResponse
from rest_framework.response import Response

from accounts.permissions import IsAdmin
from ai.services.baza_dossier import (
    EXPORT_LIMIT,
    baza_countries,
    baza_dataset,
    baza_overview,
    baza_products,
    baza_search,
)
from ai.unthrottled import UnthrottledAPIView


class AdminBazaOverviewView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(baza_overview())


class AdminBazaCountriesView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response({"results": baza_countries()})


class AdminBazaProductsView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        return Response({"results": baza_products(q=q)})


class AdminBazaDatasetView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request, kind: str):
        kind = (kind or "").strip().lower()
        if kind not in {"wallets", "users", "transactions", "hashes"}:
            return Response({"detail": "Noto'g'ri to'plam."}, status=400)
        q = (request.query_params.get("q") or "").strip()
        return Response(baza_dataset(kind, q=q))


class AdminBazaSearchView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response({"detail": "Kamida 2 belgi kiriting."}, status=400)
        return Response(baza_search(q))


class AdminBazaExportView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        kind = (request.query_params.get("kind") or "overview").strip().lower()
        fmt = (request.query_params.get("format") or "csv").strip().lower()
        q = (request.query_params.get("q") or "").strip()

        if kind == "search":
            payload = baza_search(q)
        elif kind == "countries":
            payload = {"results": baza_countries()}
        elif kind == "products":
            payload = {"results": baza_products(q=q)}
        elif kind in {"wallets", "users", "transactions", "hashes"}:
            payload = baza_dataset(kind, q=q, limit=EXPORT_LIMIT)
        else:
            payload = baza_overview()

        if fmt == "json":
            raw = json.dumps(payload, ensure_ascii=False, indent=2, default=str)
            resp = HttpResponse(raw, content_type="application/json; charset=utf-8")
            resp["Content-Disposition"] = f'attachment; filename="baza-{kind}.json"'
            return resp

        buf = StringIO()
        writer = csv.writer(buf)
        if kind == "countries":
            writer.writerow(["prefix", "country", "iso", "flag", "start", "end"])
            for row in payload.get("results") or []:
                writer.writerow(
                    [
                        row.get("prefix_label"),
                        row.get("country_name"),
                        row.get("iso"),
                        row.get("flag"),
                        row.get("prefix_start"),
                        row.get("prefix_end"),
                    ]
                )
        elif kind == "products":
            writer.writerow(
                [
                    "id",
                    "name",
                    "brand",
                    "barcode",
                    "country",
                    "views",
                    "clicks",
                    "viewers",
                    "clickers",
                    "likes",
                    "ingredients",
                ]
            )
            for row in payload.get("results") or []:
                writer.writerow(
                    [
                        row.get("id"),
                        row.get("name"),
                        row.get("brand"),
                        row.get("barcode"),
                        row.get("country_of_origin"),
                        row.get("views_count"),
                        row.get("clicks_count"),
                        row.get("viewers_count"),
                        row.get("clickers_count"),
                        row.get("likes_count"),
                        (row.get("ingredients_text") or "")[:500],
                    ]
                )
        elif kind == "wallets":
            writer.writerow(
                [
                    "wallet_id",
                    "wallet_number",
                    "balance",
                    "is_frozen",
                    "user_id",
                    "full_name",
                    "phone",
                    "email",
                ]
            )
            for row in payload.get("results") or []:
                writer.writerow(
                    [
                        row.get("wallet_id"),
                        row.get("wallet_number"),
                        row.get("balance"),
                        row.get("is_frozen"),
                        row.get("user_id"),
                        row.get("full_name"),
                        row.get("phone"),
                        row.get("email"),
                    ]
                )
        elif kind == "users":
            writer.writerow(
                ["user_id", "full_name", "phone", "email", "username", "region", "wallet_number", "is_active"]
            )
            for row in payload.get("results") or []:
                writer.writerow(
                    [
                        row.get("user_id"),
                        row.get("full_name"),
                        row.get("phone"),
                        row.get("email"),
                        row.get("username"),
                        row.get("region"),
                        row.get("wallet_number"),
                        row.get("is_active"),
                    ]
                )
        elif kind == "transactions":
            writer.writerow(
                [
                    "id",
                    "entry_type",
                    "amount",
                    "balance_after",
                    "entry_hash",
                    "prev_hash",
                    "wallet_number",
                    "user_id",
                    "full_name",
                    "created_at",
                ]
            )
            for row in payload.get("results") or []:
                writer.writerow(
                    [
                        row.get("id"),
                        row.get("entry_type"),
                        row.get("amount"),
                        row.get("balance_after"),
                        row.get("entry_hash"),
                        row.get("prev_hash"),
                        row.get("wallet_number"),
                        row.get("user_id"),
                        row.get("full_name"),
                        row.get("created_at"),
                    ]
                )
        elif kind == "hashes":
            writer.writerow(
                ["ledger_id", "entry_hash", "prev_hash", "wallet_number", "user_id", "full_name", "entry_type"]
            )
            for row in payload.get("results") or []:
                writer.writerow(
                    [
                        row.get("ledger_id"),
                        row.get("entry_hash"),
                        row.get("prev_hash"),
                        row.get("wallet_number"),
                        row.get("user_id"),
                        row.get("full_name"),
                        row.get("entry_type"),
                    ]
                )
        elif kind == "search":
            writer.writerow(["section", "key", "value"])
            for dossier in payload.get("dossiers") or []:
                user = dossier.get("user") or {}
                uid = user.get("id")
                writer.writerow(["user", "id", uid])
                writer.writerow(["user", "name", user.get("full_name")])
                writer.writerow(["user", "phone", user.get("phone")])
                wallet = dossier.get("wallet") or {}
                writer.writerow(["wallet", "number", wallet.get("wallet_number")])
                writer.writerow(["wallet", "balance", wallet.get("balance")])
                for tx in dossier.get("transactions") or []:
                    writer.writerow(["tx", tx.get("id"), f"{tx.get('entry_type')} {tx.get('amount')}"])
        else:
            writer.writerow(["metric", "value"])
            for key, value in payload.items():
                writer.writerow([key, value])

        resp = HttpResponse(buf.getvalue(), content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = f'attachment; filename="baza-{kind}.csv"'
        return resp

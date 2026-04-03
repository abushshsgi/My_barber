"""O'zbekistonning 12 ta viloyati (bir xil ro'yxat — mijoz, barber, admin)."""

from django.db import models


class UzRegion(models.TextChoices):
    ANDIJON = "ANDIJON", "Andijon viloyati"
    BUXORO = "BUXORO", "Buxoro viloyati"
    FARGONA = "FARGONA", "Farg'ona viloyati"
    JIZZAX = "JIZZAX", "Jizzax viloyati"
    QASHQADARYO = "QASHQADARYO", "Qashqadaryo viloyati"
    NAVOIY = "NAVOIY", "Navoiy viloyati"
    NAMANGAN = "NAMANGAN", "Namangan viloyati"
    SAMARQAND = "SAMARQAND", "Samarqand viloyati"
    SURXONDARYO = "SURXONDARYO", "Surxondaryo viloyati"
    SIRDARYO = "SIRDARYO", "Sirdaryo viloyati"
    TOSHKENT_V = "TOSHKENT_V", "Toshkent viloyati"
    XORAZM = "XORAZM", "Xorazm viloyati"

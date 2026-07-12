import io

import openpyxl
from django.test import TestCase

from import_export.parsers import (
    ExcelStudentRaw,
    parse_flat_excel_buffer,
    parse_rating_excel_buffer,
)


class ParserSmokeTests(TestCase):
    databases = []

    def test_flat_parser_reads_simple_columns(self):
        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.append(["Студент", "Группа", "Курс", "Баллы (учеба)", "Баллы (активность)", "Общий балл"])
        sheet.append(["Иван Петров", "ИС-101", 2, 80, 20, 100])
        buffer = io.BytesIO()
        workbook.save(buffer)
        buffer.seek(0)

        result = parse_flat_excel_buffer(buffer.getvalue())

        self.assertEqual(len(result), 1)
        student = result[0]
        self.assertIsInstance(student, ExcelStudentRaw)
        self.assertEqual(student.full_name, "Иван Петров")
        self.assertEqual(student.group_name, "ИС-101")

    def test_multi_level_parser_detects_header_and_data(self):
        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.append(["", "", "", "", "Категория"])
        sheet.append(["Группа", "ФИО", "Итоговый балл", "Средний балл", "Посещаемость"])
        sheet.append(["", "", "", "", "1"])
        sheet.append(["ИС-101", "Иван Петров", 100, 80, 90])
        buffer = io.BytesIO()
        workbook.save(buffer)
        buffer.seek(0)

        parsed = parse_rating_excel_buffer(buffer.getvalue())

        self.assertEqual(len(parsed.students), 1)
        student = parsed.students[0]
        self.assertEqual(student.full_name, "Иван Петров")
        self.assertEqual(student.total_score, 100)

package com.rd.platform.common.utils;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * 轻量级 CSV 工具类：不依赖任何第三方库，支持带 BOM 的 UTF-8，
 * 支持字段内含逗号、双引号、换行（用双引号包裹，内部双引号转义为 "")。
 * 用于需求 / 测试用例的模板下载与批量导入。
 */
public final class CsvUtils {

    /** UTF-8 BOM，写入后 Excel/WPS 打开中文不乱码 */
    public static final String BOM = "\uFEFF";

    private CsvUtils() {
    }

    /**
     * 将一行字段转义拼接为 CSV 行。
     */
    public static String toCsvLine(List<String> fields) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < fields.size(); i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(escape(fields.get(i)));
        }
        return sb.toString();
    }

    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        boolean needQuote = value.contains(",") || value.contains("\"")
                || value.contains("\n") || value.contains("\r");
        String v = value.replace("\"", "\"\"");
        return needQuote ? "\"" + v + "\"" : v;
    }

    /**
     * 解析 CSV 内容为二维列表（含表头行）。自动去除 UTF-8 BOM。
     */
    public static List<List<String>> parse(byte[] content) {
        List<List<String>> rows = new ArrayList<>();
        if (content == null || content.length == 0) {
            return rows;
        }
        try (InputStream in = new ByteArrayInputStream(content);
             BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            StringBuilder field = new StringBuilder();
            List<String> current = new ArrayList<>();
            boolean inQuotes = false;
            boolean started = false;
            int ci;
            boolean firstChar = true;
            while ((ci = reader.read()) != -1) {
                char c = (char) ci;
                // 去除文件开头 BOM
                if (firstChar) {
                    firstChar = false;
                    if (c == '\uFEFF') {
                        continue;
                    }
                }
                started = true;
                if (inQuotes) {
                    if (c == '"') {
                        // 前瞻：连续两个双引号表示转义
                        reader.mark(1);
                        int next = reader.read();
                        if (next == '"') {
                            field.append('"');
                        } else {
                            inQuotes = false;
                            if (next != -1) {
                                reader.reset();
                            }
                        }
                    } else {
                        field.append(c);
                    }
                } else {
                    if (c == '"') {
                        inQuotes = true;
                    } else if (c == ',') {
                        current.add(field.toString());
                        field.setLength(0);
                    } else if (c == '\n') {
                        current.add(field.toString());
                        field.setLength(0);
                        rows.add(current);
                        current = new ArrayList<>();
                    } else if (c == '\r') {
                        // 忽略，等待 \n
                    } else {
                        field.append(c);
                    }
                }
            }
            // 收尾最后一个字段/行
            if (started && (field.length() > 0 || !current.isEmpty())) {
                current.add(field.toString());
                rows.add(current);
            }
        } catch (Exception e) {
            throw new RuntimeException("CSV 解析失败：" + e.getMessage(), e);
        }
        return rows;
    }

    /**
     * 取行中第 index 列，越界或 null 返回空串并去除首尾空白。
     */
    public static String cell(List<String> row, int index) {
        if (row == null || index < 0 || index >= row.size()) {
            return "";
        }
        String v = row.get(index);
        return v == null ? "" : v.trim();
    }

    /**
     * 判断整行是否为空（所有单元格均为空白）。
     */
    public static boolean isBlankRow(List<String> row) {
        if (row == null || row.isEmpty()) {
            return true;
        }
        for (String c : row) {
            if (c != null && !c.trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }
}

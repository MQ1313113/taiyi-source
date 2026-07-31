package com.rd.platform.common.utils;

import lombok.Data;

@Data
public class PageParam {
    private Integer pageNum = 1;
    private Integer pageSize = 10;
    private String orderBy;
    private String orderDirection = "DESC";
}

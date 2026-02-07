# Open-Source Comparison (Design & Features)

This comparison highlights design and feature differences between PHOS and popular open‑source data exploration tools.

## Summary Table

| Tool | Core Focus | Strengths | Gaps vs PHOS |
| --- | --- | --- | --- |
| **OpenRefine** | Data cleaning & transformation | Powerful clustering, facet filters, reconciliation | No spec‑driven UI state, limited multi‑view visualizations |
| **Apache Superset** | BI dashboards & charts | Rich visualization catalog, SQL‑native | Not a facet‑first explorer, heavier setup for ad‑hoc exploration |
| **Metabase** | Self‑service BI | Simple UX, quick dashboards | Less focus on spec serialization and multi‑level grouping |
| **Grafana** | Time‑series observability | Powerful time‑series & dashboards | Not optimized for arbitrary schema faceting |
| **Kibana** | Log/search analytics | Strong search & aggregation | Schema‑agnostic faceting is limited; heavier infra requirements |
| **DataTables** (OSS) | Tabular UI | Lightweight, fast tables | Lacks spec‑driven state and data‑aware filtering |

## Design Notes

- **Spec‑driven state**: PHOS treats UI state as JSON, enabling shareable, versioned configurations. Most tools embed state in dashboards rather than a portable spec.
- **Faceted browsing**: PHOS is built around faceted navigation, while many tools are chart‑first or SQL‑first.
- **Multi‑view exploration**: PHOS ships grid, grouping, and graph modes designed for quick switching.

## When to Choose PHOS

- You need **portable, versioned configurations** for data exploration.
- You want **facet‑first filtering** rather than chart‑first dashboards.
- You need **rapid schema exploration** and **multi‑level grouping** without heavy infra.

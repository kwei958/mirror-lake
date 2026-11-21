# 명경지수 호숫가 · 위즈덤투스

A calm 3D lakeside where visitors walk as the Wisdom Tooth character, share simple emotions, and see S&P 500 / NASDAQ 100 charts floating on the water.

- Up to 50 people at once; everyone with the link sees each other (via public MQTT relays: broker.emqx.io, broker.hivemq.com).
- `stats/`: anonymous visitor counts and stay times, collected in 4-hour windows by `.github/workflows/stats.yml` (no nicknames saved).
- `data.json`: the 위즈덤투스 daily chart task adds each trading day's S&P 500 / NASDAQ 100 closes (`scripts/add_close.py`); a GitHub Action backfills from FRED at 06:45 KST, Mon–Sat.
- Music: four original piano pieces (`lake_piano.mp3`, `lake_piano_3..5.mp3`) played in turn, rendered with the Salamander Grand Piano samples by Alexander Holm (CC BY 3.0).

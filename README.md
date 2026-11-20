# 명경지수 호숫가 · 위즈덤투스

A calm 3D lakeside where visitors walk as the Wisdom Tooth character, share simple emotions, and see S&P 500 / NASDAQ 100 charts floating on the water.

- Up to 50 people at once; everyone with the link sees each other (via public MQTT relays: broker.emqx.io, broker.hivemq.com).
- `data.json` is refreshed every day at 06:30 KST by `.github/workflows/update-data.yml` (FRED daily closes, delayed).
- Music: original piano loop (`lake_piano.mp3`) rendered with the Salamander Grand Piano samples by Alexander Holm (CC BY 3.0).

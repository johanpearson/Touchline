# Changelog

## [1.3.0](https://github.com/johanpearson/Touchline/compare/v1.2.0...v1.3.0) (2026-11-13)


### Features

* **game:** club and player model with 12 attributes and team profile derivation ([#84](https://github.com/johanpearson/Touchline/issues/84)) ([9aef09c](https://github.com/johanpearson/Touchline/commit/9aef09cdc1372037f90332652848636a43b645ef)), closes [#71](https://github.com/johanpearson/Touchline/issues/71)
* **game:** double round-robin fixture schedule ([#89](https://github.com/johanpearson/Touchline/issues/89)) ([2366955](https://github.com/johanpearson/Touchline/commit/236695551319d4438c18846d23177eae9d56dc68)), closes [#75](https://github.com/johanpearson/Touchline/issues/75)
* **game:** end of season summary and next season ([#92](https://github.com/johanpearson/Touchline/issues/92)) ([0b196fc](https://github.com/johanpearson/Touchline/commit/0b196fcc43fbd88e103088c4fdcd2a5319809bc8))
* **game:** fictional player and squad generator ([#87](https://github.com/johanpearson/Touchline/issues/87)) ([6a5b525](https://github.com/johanpearson/Touchline/commit/6a5b525a9585180aa2b1f0af54b624601eaf4b10)), closes [#73](https://github.com/johanpearson/Touchline/issues/73)
* **game:** generate a league of fictional clubs with balanced strengths ([#88](https://github.com/johanpearson/Touchline/issues/88)) ([f449a74](https://github.com/johanpearson/Touchline/commit/f449a747397ea5e0514d10726cb1ec737647d829)), closes [#74](https://github.com/johanpearson/Touchline/issues/74)
* **game:** generate fictional club identities ([#86](https://github.com/johanpearson/Touchline/issues/86)) ([c938c74](https://github.com/johanpearson/Touchline/commit/c938c7443aeff15fd13158ec6da68f3bf5629126))
* **game:** league table with tie-breakers ([#90](https://github.com/johanpearson/Touchline/issues/90)) ([2333a05](https://github.com/johanpearson/Touchline/commit/2333a05e034e2c94f67ef8dfd5a279714f7a6117)), closes [#76](https://github.com/johanpearson/Touchline/issues/76)
* **game:** season state and matchday simulation ([#91](https://github.com/johanpearson/Touchline/issues/91)) ([c0a9f40](https://github.com/johanpearson/Touchline/commit/c0a9f40de950557ecece9caceafabf90d199ec01))
* **ui:** app shell with hash routing and new career screen ([#93](https://github.com/johanpearson/Touchline/issues/93)) ([0c3886b](https://github.com/johanpearson/Touchline/commit/0c3886ba377c8730c20ad3fb6e0873b11364cfc1))
* **ui:** club and squad overview screen ([#95](https://github.com/johanpearson/Touchline/issues/95)) ([3a2a5c5](https://github.com/johanpearson/Touchline/commit/3a2a5c53db1475a481b017bb120708822f151a36)), closes [#81](https://github.com/johanpearson/Touchline/issues/81)
* **ui:** league table and fixtures screens ([#94](https://github.com/johanpearson/Touchline/issues/94)) ([bbe6284](https://github.com/johanpearson/Touchline/commit/bbe6284e21d2ec17f53f7622b7f64381aa515055)), closes [#80](https://github.com/johanpearson/Touchline/issues/80)
* **ui:** play the season with matchday flow, quick sim and season end screen ([#97](https://github.com/johanpearson/Touchline/issues/97)) ([f2fc399](https://github.com/johanpearson/Touchline/commit/f2fc399445b1aaa0f154d9fb140c0949e2ec5de5))

## [1.2.0](https://github.com/johanpearson/Touchline/compare/v1.1.0...v1.2.0) (2026-11-13)


### Features

* **game:** attribute goals to squad players for commentary ([#68](https://github.com/johanpearson/Touchline/issues/68)) ([41c0d87](https://github.com/johanpearson/Touchline/commit/41c0d8743214be7a6f665f98806a3482f9d8786e)), closes [#61](https://github.com/johanpearson/Touchline/issues/61)
* **match-view:** animate feed lines in with reduced-motion support ([#67](https://github.com/johanpearson/Touchline/issues/67)) ([513e8b1](https://github.com/johanpearson/Touchline/commit/513e8b1fbe23e66843b60d85300a1e54f549be28)), closes [#60](https://github.com/johanpearson/Touchline/issues/60)
* **match-view:** half-time screen ([#66](https://github.com/johanpearson/Touchline/issues/66)) ([8db998c](https://github.com/johanpearson/Touchline/commit/8db998c2f70eb89fe7fecb47074ff8e0f9d86686))
* **match-view:** scoreboard, momentum chart, stats panel, feed and speed controls ([#63](https://github.com/johanpearson/Touchline/issues/63)) ([98e2e9e](https://github.com/johanpearson/Touchline/commit/98e2e9e41003fd114b0a8fbfbd011362d107412f))


### Bug Fixes

* **commentary:** only announce second half for the second-half kickoff ([#70](https://github.com/johanpearson/Touchline/issues/70)) ([8e0a7c4](https://github.com/johanpearson/Touchline/commit/8e0a7c4ca7e49efe4fbba02463dd6f2368f8db95))

## [1.1.0](https://github.com/johanpearson/Touchline/compare/v1.0.1...v1.1.0) (2026-11-13)


### Features

* **commentary:** add match commentary templates in English and Swedish ([#59](https://github.com/johanpearson/Touchline/issues/59)) ([5dce2b9](https://github.com/johanpearson/Touchline/commit/5dce2b96ab26d128a560a8994db4f69659c41b3e))
* **engine:** add match domain model and event types ([#45](https://github.com/johanpearson/Touchline/issues/45)) ([e8b5463](https://github.com/johanpearson/Touchline/commit/e8b5463ebed8e687d3a5b654ceb346a6080e895f))
* **engine:** add seeded forkable random number generator ([#43](https://github.com/johanpearson/Touchline/issues/43)) ([6cc5098](https://github.com/johanpearson/Touchline/commit/6cc509802e9f31b960dc771062943a7155f00371)), closes [#14](https://github.com/johanpearson/Touchline/issues/14)
* **engine:** match statistics from the event log ([#55](https://github.com/johanpearson/Touchline/issues/55)) ([21fc353](https://github.com/johanpearson/Touchline/commit/21fc3533b9e1cc00c9173e5293223309f092f448))
* **engine:** periods, half-time pause and added time ([#54](https://github.com/johanpearson/Touchline/issues/54)) ([69eaa7c](https://github.com/johanpearson/Touchline/commit/69eaa7caf5d99ca422e1e04fa2b6380b8eaa80fc)), closes [#17](https://github.com/johanpearson/Touchline/issues/17)
* **engine:** tune how strongly team ratings affect results ([#58](https://github.com/johanpearson/Touchline/issues/58)) ([a6d88c0](https://github.com/johanpearson/Touchline/commit/a6d88c03eb7ad870e463d5d1d0a51a23aa4ef3d4)), closes [#57](https://github.com/johanpearson/Touchline/issues/57)
* **engine:** zone-based match simulation v1 ([#46](https://github.com/johanpearson/Touchline/issues/46)) ([726317a](https://github.com/johanpearson/Touchline/commit/726317a32d30f475f308e27e00d64fad6e956431)), closes [#16](https://github.com/johanpearson/Touchline/issues/16)
* **match-view:** momentum terrain renderer ([#62](https://github.com/johanpearson/Touchline/issues/62)) ([be2a45f](https://github.com/johanpearson/Touchline/commit/be2a45f1b9c81859a8e7dd377dfa64dff5e98695))


### Bug Fixes

* **engine:** no danger while the attack is in its own half ([#52](https://github.com/johanpearson/Touchline/issues/52)) ([c4b5245](https://github.com/johanpearson/Touchline/commit/c4b5245253d475c5cb2cd8dd2da602402c2d51a5)), closes [#50](https://github.com/johanpearson/Touchline/issues/50)

## [1.0.1](https://github.com/johanpearson/Touchline/compare/v1.0.0...v1.0.1) (2026-11-13)


### Bug Fixes

* **ci:** exclude generated CHANGELOG.md from Biome ([#37](https://github.com/johanpearson/Touchline/issues/37)) ([d117968](https://github.com/johanpearson/Touchline/commit/d117968b6438ba71f16bbd8b0a82e4dfbea64bba)), closes [#36](https://github.com/johanpearson/Touchline/issues/36)

## 1.0.0 (2026-11-13)


### Features

* **i18n:** typed English and Swedish locales ([#33](https://github.com/johanpearson/Touchline/issues/33)) ([e5339d4](https://github.com/johanpearson/Touchline/commit/e5339d41b9ff274a3e977ceebd640749e6de114f)), closes [#10](https://github.com/johanpearson/Touchline/issues/10)
* **platform:** SaveStore interface, in-memory store and migration runner ([#35](https://github.com/johanpearson/Touchline/issues/35)) ([aa283dd](https://github.com/johanpearson/Touchline/commit/aa283dd17cc1350893be6ada24d9ed019ff9d02c))

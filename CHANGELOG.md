# Changelog

## [1.9.0](https://github.com/johanpearson/Touchline/compare/v1.8.0...v1.9.0) (2026-11-20)


### Features

* **engine:** in-match energy drain that lowers performance ([#414](https://github.com/johanpearson/Touchline/issues/414)) ([770e1e3](https://github.com/johanpearson/Touchline/commit/770e1e3cb35c990906f1531b9fe428d14cee3f91))
* **game:** change formation during a match ([#439](https://github.com/johanpearson/Touchline/issues/439)) ([9ad3a39](https://github.com/johanpearson/Touchline/commit/9ad3a395cc1bf8db3d6500364ad117c414cd3c5d))
* **game:** use end-of-match energy in MatchReport and the post-match fitness drain ([#418](https://github.com/johanpearson/Touchline/issues/418)) ([71ad33c](https://github.com/johanpearson/Touchline/commit/71ad33cb52b9038ff168ca030ef7552c6597f71f))
* **ui:** back action and route hierarchy ([#405](https://github.com/johanpearson/Touchline/issues/405)) ([35922cf](https://github.com/johanpearson/Touchline/commit/35922cf0292e5dd36eaa9f11ff55aeec90be9eae))
* **ui:** group quiet build-up into beats in the playback director ([#419](https://github.com/johanpearson/Touchline/issues/419)) ([bb5e2b1](https://github.com/johanpearson/Touchline/commit/bb5e2b12b974135bea2d40c7c336f8496f987037))
* **ui:** live density preview in settings ([#406](https://github.com/johanpearson/Touchline/issues/406)) ([b9cd1e4](https://github.com/johanpearson/Touchline/commit/b9cd1e48dfc5c39ca66836a9b2705325b4b50688))
* **ui:** lock the match screen and confirm before leaving a match ([#425](https://github.com/johanpearson/Touchline/issues/425)) ([3cf78a1](https://github.com/johanpearson/Touchline/commit/3cf78a1d241724426bd3d0882832e2d8fa2d5d54))
* **ui:** persist a match in progress and resume it after a reload ([#421](https://github.com/johanpearson/Touchline/issues/421)) ([983dd28](https://github.com/johanpearson/Touchline/commit/983dd2863f46e77f0ae85d9a570c74b27056ffac))
* **ui:** play matches at a readable pace with three playback modes ([#417](https://github.com/johanpearson/Touchline/issues/417)) ([8504462](https://github.com/johanpearson/Touchline/commit/8504462416d4a058e8357d3185606102fb6b952a))
* **ui:** playback director that paces match events ([#412](https://github.com/johanpearson/Touchline/issues/412)) ([706d807](https://github.com/johanpearson/Touchline/commit/706d807bd2b5ba68cdd53a616f47ca4f42a8804c))
* **ui:** preview the new positions of a pending formation change ([#440](https://github.com/johanpearson/Touchline/issues/440)) ([6bddc13](https://github.com/johanpearson/Touchline/commit/6bddc1351f9004f90543ee1875ce15021721afc4)), closes [#438](https://github.com/johanpearson/Touchline/issues/438)
* **ui:** show player rating in the lineup, energy as a secondary indicator ([#404](https://github.com/johanpearson/Touchline/issues/404)) ([4513b1f](https://github.com/johanpearson/Touchline/commit/4513b1f4b5b7390d0376c5d0ebe2c7c7c3fc73d2)), closes [#382](https://github.com/johanpearson/Touchline/issues/382)
* **ui:** show rating and live energy in the match lineups ([#436](https://github.com/johanpearson/Touchline/issues/436)) ([8258864](https://github.com/johanpearson/Touchline/commit/825886449bd860c6b57e717cb9794f0f8ae9dc6a)), closes [#391](https://github.com/johanpearson/Touchline/issues/391)
* **ui:** smooth momentum area chart ([#411](https://github.com/johanpearson/Touchline/issues/411)) ([0f1e2eb](https://github.com/johanpearson/Touchline/commit/0f1e2ebf1f7f00f747016127112eba5407f007a7)), closes [#384](https://github.com/johanpearson/Touchline/issues/384)
* **ui:** substitutions and tactic changes at any stoppage ([#434](https://github.com/johanpearson/Touchline/issues/434)) ([9bca1d1](https://github.com/johanpearson/Touchline/commit/9bca1d1eded6b4524a4eef182c677797bbb835d3))
* **ui:** warn when the match in progress cannot be saved ([#422](https://github.com/johanpearson/Touchline/issues/422)) ([6ff7c7f](https://github.com/johanpearson/Touchline/commit/6ff7c7f77ffd0247660ab38715f0f7de8164c99f)), closes [#420](https://github.com/johanpearson/Touchline/issues/420)


### Bug Fixes

* **ci:** exclude .claude from Biome and bump config schema to 2.6.8 ([#443](https://github.com/johanpearson/Touchline/issues/443)) ([d676e9f](https://github.com/johanpearson/Touchline/commit/d676e9f8e7ddb5db36a4d616749bfcc8e5196c0b))
* **e2e:** repair nightly failures from nav, rating label and density preview changes ([#409](https://github.com/johanpearson/Touchline/issues/409)) ([fd0ec6e](https://github.com/johanpearson/Touchline/commit/fd0ec6ef47eea2d9c929adb361e66b7796b56d6a))
* **ui:** keep the browser history clean when the match lock blocks a navigation ([#444](https://github.com/johanpearson/Touchline/issues/444)) ([e866c9f](https://github.com/johanpearson/Touchline/commit/e866c9f207faf882281563279fa5ad5af6b65efd)), closes [#423](https://github.com/johanpearson/Touchline/issues/423)
* **ui:** make bench energy in the changes sheet match the lineups panel ([#437](https://github.com/johanpearson/Touchline/issues/437)) ([de2f859](https://github.com/johanpearson/Touchline/commit/de2f8592a59aa7f9fbdda3f6003e6cd05c764bf1)), closes [#435](https://github.com/johanpearson/Touchline/issues/435)
* **ui:** move the language selector to settings only ([#402](https://github.com/johanpearson/Touchline/issues/402)) ([3e74581](https://github.com/johanpearson/Touchline/commit/3e745817b5c09de0b305a493963c61c78cb210a8)), closes [#381](https://github.com/johanpearson/Touchline/issues/381)
* **ui:** show the score once in the 2D match view ([#410](https://github.com/johanpearson/Touchline/issues/410)) ([97e80e7](https://github.com/johanpearson/Touchline/commit/97e80e769f531ebb961ebe0d09c636583aebc455))

## [1.8.0](https://github.com/johanpearson/Touchline/compare/v1.7.0...v1.8.0) (2026-11-18)


### Features

* **game:** add potential, contracts, finances and minutes to the career model (schema v7) ([#356](https://github.com/johanpearson/Touchline/issues/356)) ([0a6f018](https://github.com/johanpearson/Touchline/commit/0a6f0184ffbe867604691b2d25adfe8278e1a461))
* **game:** AI clubs use substitutions and shouts ([#367](https://github.com/johanpearson/Touchline/issues/367)) ([06bb96b](https://github.com/johanpearson/Touchline/commit/06bb96b13c71c29c82c923dcbe34e9b3fcf1e17e))
* **game:** AI squad building, contract renewals and transfer offers ([#362](https://github.com/johanpearson/Touchline/issues/362)) ([ce91371](https://github.com/johanpearson/Touchline/commit/ce913712199c0badf066294e4e2acea52e17b937))
* **game:** cap the free-agent pool at the rollover ([#373](https://github.com/johanpearson/Touchline/issues/373)) ([5c3ce43](https://github.com/johanpearson/Touchline/commit/5c3ce43f8a1eec259ecadf9978607ac5094d115e)), closes [#365](https://github.com/johanpearson/Touchline/issues/365)
* **game:** contracts, wages and the club economy at season rollover ([#359](https://github.com/johanpearson/Touchline/issues/359)) ([85bc4fd](https://github.com/johanpearson/Touchline/commit/85bc4fd1417d8a23e2b75e3529fca14218c15221))
* **game:** run the off-season at the rollover and balance the league over ten seasons ([#366](https://github.com/johanpearson/Touchline/issues/366)) ([4f219cd](https://github.com/johanpearson/Touchline/commit/4f219cdd29d122237d2fe716ff5bf5e21ce9d41e))
* **game:** track minutes played and develop players once a year ([#358](https://github.com/johanpearson/Touchline/issues/358)) ([0ea6ade](https://github.com/johanpearson/Touchline/commit/0ea6ade924eb2c56ed44d84f04aa4187384d8efd))
* **game:** transfer market operations: buy, sign free agents, accept offers, release ([#360](https://github.com/johanpearson/Touchline/issues/360)) ([cc26a4b](https://github.com/johanpearson/Touchline/commit/cc26a4bef4c66845bd88b373780175af014b3421))
* **game:** youth intake and retirement ([#361](https://github.com/johanpearson/Touchline/issues/361)) ([6e44fec](https://github.com/johanpearson/Touchline/commit/6e44fec7a1e5d03806a0329ec28450fd4779fa06))
* **ui:** off-season screen with season review, contract renewals and next-season gate ([#372](https://github.com/johanpearson/Touchline/issues/372)) ([7628f6a](https://github.com/johanpearson/Touchline/commit/7628f6a0ed1a13986d58c0a611f4174ec3f9aefc))
* **ui:** show age, potential, contract, value and development in the squad screen ([#364](https://github.com/johanpearson/Touchline/issues/364)) ([723c0e8](https://github.com/johanpearson/Touchline/commit/723c0e8b2400a65b6bf187a662bb896b70bbd16f))
* **ui:** transfer market screen with free agents, buying and offers ([#371](https://github.com/johanpearson/Touchline/issues/371)) ([58530e6](https://github.com/johanpearson/Touchline/commit/58530e6e6cadf533df5a528505eb61edf909dad4))

## [1.7.0](https://github.com/johanpearson/Touchline/compare/v1.6.0...v1.7.0) (2026-11-17)


### Features

* **game:** changes at any minute and touchline shouts ([#293](https://github.com/johanpearson/Touchline/issues/293)) ([de937a5](https://github.com/johanpearson/Touchline/commit/de937a5c7360ca22a927ba16cf963eeec4cfb41d))
* **game:** home and away kits with clash detection in the match view ([#274](https://github.com/johanpearson/Touchline/issues/274)) ([6ba1e8d](https://github.com/johanpearson/Touchline/commit/6ba1e8d6ffbbe6d57c25eb776239d371aa5a9241)), closes [#248](https://github.com/johanpearson/Touchline/issues/248)
* **game:** rate players at the position played ([#288](https://github.com/johanpearson/Touchline/issues/288)) ([710c052](https://github.com/johanpearson/Touchline/commit/710c0525fd36640695d432e64e3ddfebcacbcf11))
* **ui:** add app shell with sidebar, icon rail, bottom tab bar and header ([#290](https://github.com/johanpearson/Touchline/issues/290)) ([f6bb554](https://github.com/johanpearson/Touchline/commit/f6bb55404ff6166fc21abc174248197fee3b64a4))
* **ui:** add data table with column priorities, sorting, density and card mode ([#286](https://github.com/johanpearson/Touchline/issues/286)) ([1dac1a5](https://github.com/johanpearson/Touchline/commit/1dac1a54b35830c66cae717463581dfe32372ff7))
* **ui:** add design tokens, themes and typography ([#276](https://github.com/johanpearson/Touchline/issues/276)) ([1d946bb](https://github.com/johanpearson/Touchline/commit/1d946bbe49b7cac525488b5ee8bb69e17bbf9673)), closes [#247](https://github.com/johanpearson/Touchline/issues/247)
* **ui:** add dialog, confirm dialog, drawer, tooltip and toast components ([#284](https://github.com/johanpearson/Touchline/issues/284)) ([157e284](https://github.com/johanpearson/Touchline/commit/157e284acf2e555a2c3d1114ceb6d3560e4835b4))
* **ui:** add input, select, segmented control, tabs and scroll area ([#283](https://github.com/johanpearson/Touchline/issues/283)) ([56267c6](https://github.com/johanpearson/Touchline/commit/56267c65c81d5f6b261db469fa6ac2e7b87c682a))
* **ui:** add Storybook and the first components (button, icon button, badge, card, skeleton, empty state) ([#279](https://github.com/johanpearson/Touchline/issues/279)) ([bd34427](https://github.com/johanpearson/Touchline/commit/bd34427190c7572af20397cebd16bcb3ac289974))
* **ui:** add the player profile screen ([#312](https://github.com/johanpearson/Touchline/issues/312)) ([b5436fc](https://github.com/johanpearson/Touchline/commit/b5436fc0388a1ac2b3657e9870dde11d2fb36a89))
* **ui:** command palette on Ctrl/Cmd+K for screens, clubs and players ([#297](https://github.com/johanpearson/Touchline/issues/297)) ([9143207](https://github.com/johanpearson/Touchline/commit/9143207b7aecc1a7433dc7cd766431041e97fd32))
* **ui:** link player profiles from the tactics screen ([#353](https://github.com/johanpearson/Touchline/issues/353)) ([138aeec](https://github.com/johanpearson/Touchline/commit/138aeecd395a8e421af422f1dae9e46bf9720a31)), closes [#321](https://github.com/johanpearson/Touchline/issues/321)
* **ui:** motion module, route transitions and feedback toasts ([#348](https://github.com/johanpearson/Touchline/issues/348)) ([e5cd87d](https://github.com/johanpearson/Touchline/commit/e5cd87da3655e4ad6a28c2365c1ec6ad348ddcd1))
* **ui:** motion pass part 2 (exit animations, rail expand, row reorder, number highlights) ([#355](https://github.com/johanpearson/Touchline/issues/355)) ([52f688e](https://github.com/johanpearson/Touchline/commit/52f688ebaaaec86195add01c8ae8653b84b6fb28)), closes [#347](https://github.com/johanpearson/Touchline/issues/347)
* **ui:** new career step 1, pick a league ([#303](https://github.com/johanpearson/Touchline/issues/303)) ([5a566b6](https://github.com/johanpearson/Touchline/commit/5a566b69ef3642d7f6d08cc56e3d0c6846e9d164))
* **ui:** new career step 2, pick your club (club card, kits, club strip) ([#304](https://github.com/johanpearson/Touchline/issues/304)) ([e90ee9e](https://github.com/johanpearson/Touchline/commit/e90ee9ea99b3df0214f8ce90220f3f429fe2e43f))
* **ui:** pre-match screen with lineup check and opponent before kickoff ([#330](https://github.com/johanpearson/Touchline/issues/330)) ([7b60a04](https://github.com/johanpearson/Touchline/commit/7b60a04e19e63920f07e5f8db22f2dac73ad520b)), closes [#265](https://github.com/johanpearson/Touchline/issues/265)
* **ui:** redesign half-time and the changes panel ([#344](https://github.com/johanpearson/Touchline/issues/344)) ([0ab7514](https://github.com/johanpearson/Touchline/commit/0ab7514d75dc32dfb613ef35d3a231cc1079c5c0)), closes [#268](https://github.com/johanpearson/Touchline/issues/268)
* **ui:** redesign league table and fixtures ([#315](https://github.com/johanpearson/Touchline/issues/315)) ([eae3cef](https://github.com/johanpearson/Touchline/commit/eae3cefba6e1233ba2910d1e51faa450e7e37187))
* **ui:** redesign saves and add the settings screen ([#322](https://github.com/johanpearson/Touchline/issues/322)) ([069a750](https://github.com/johanpearson/Touchline/commit/069a7501415504f47a8911bec203c67564f9a8da))
* **ui:** redesign the club screen ([#329](https://github.com/johanpearson/Touchline/issues/329)) ([4222281](https://github.com/johanpearson/Touchline/commit/42222811a4f622fc17e73db0bb2abb12b6d6826f))
* **ui:** redesign the home screen as a dashboard ([#296](https://github.com/johanpearson/Touchline/issues/296)) ([831d3b1](https://github.com/johanpearson/Touchline/commit/831d3b1ef3b0e12167ba836c4dd1abefe4ccd9f6))
* **ui:** redesign the match screen (pitch, momentum, controls, side panel, phone tabs) ([#338](https://github.com/johanpearson/Touchline/issues/338)) ([857d2d5](https://github.com/johanpearson/Touchline/commit/857d2d53994aa4335b204838c76a6f8480056b03))
* **ui:** redesign the post-match report, matchday results and season end ([#343](https://github.com/johanpearson/Touchline/issues/343)) ([e2dda90](https://github.com/johanpearson/Touchline/commit/e2dda905792abd46ea672485f32fa492c1f63222))
* **ui:** redesign the squad screen as a player table ([#305](https://github.com/johanpearson/Touchline/issues/305)) ([0e50eb6](https://github.com/johanpearson/Touchline/commit/0e50eb6cdb42c9c82e8a974274200da6cb7a5478))
* **ui:** start screen with continue, new career and load career ([#298](https://github.com/johanpearson/Touchline/issues/298)) ([fa8af77](https://github.com/johanpearson/Touchline/commit/fa8af77b23e79b569936e3246f53f7cf8ad99a75))
* **ui:** tactics and lineup screen (formation, starters, bench, tactics) ([#317](https://github.com/johanpearson/Touchline/issues/317)) ([c6d5674](https://github.com/johanpearson/Touchline/commit/c6d567446801893eabd608abba1142093fb4538b))


### Bug Fixes

* **ci:** add the shout balance suite to the fast balance groups ([#299](https://github.com/johanpearson/Touchline/issues/299)) ([2c02ca9](https://github.com/johanpearson/Touchline/commit/2c02ca984b97b232c4a7fa8cdd6fc53e2a4e78c5)), closes [#295](https://github.com/johanpearson/Touchline/issues/295)
* **ci:** run the fast balance gate as three parallel jobs ([#294](https://github.com/johanpearson/Touchline/issues/294)) ([3d316a2](https://github.com/johanpearson/Touchline/commit/3d316a2dacb62261c1b7ecb30de4ccfe59081fc3)), closes [#292](https://github.com/johanpearson/Touchline/issues/292)
* **platform:** read window.localStorage lazily in the locale store ([#280](https://github.com/johanpearson/Touchline/issues/280)) ([6cb5cf8](https://github.com/johanpearson/Touchline/commit/6cb5cf82e7a28a1cab4095e2a3570201193e8dc0)), closes [#275](https://github.com/johanpearson/Touchline/issues/275)
* **ui:** freeze timers in the match-kickoff and match-2d-pitch visual states ([#341](https://github.com/johanpearson/Touchline/issues/341)) ([ba6d3f0](https://github.com/johanpearson/Touchline/commit/ba6d3f049220eedb1c3df056de22e46dd03f8a4e))
* **ui:** make visual baselines stable between CI runs ([#349](https://github.com/johanpearson/Touchline/issues/349)) ([037bba0](https://github.com/johanpearson/Touchline/commit/037bba0939a6b2879e6d6d10b515c6019c43d98a))
* **ui:** style unchecked segmented control options in the component ([#335](https://github.com/johanpearson/Touchline/issues/335)) ([feb48f0](https://github.com/johanpearson/Touchline/commit/feb48f0c2d8500bf99c070d6fb42ab3bbdce35a2))
* **visual:** close the saved toasts one at a time in the saves screen state ([#326](https://github.com/johanpearson/Touchline/issues/326)) ([7b10607](https://github.com/johanpearson/Touchline/commit/7b106072284dc99b1835aef25a62513c0ce3a861)), closes [#325](https://github.com/johanpearson/Touchline/issues/325)
* **visual:** wait for the page height to settle before fitting the viewport ([#314](https://github.com/johanpearson/Touchline/issues/314)) ([6d68445](https://github.com/johanpearson/Touchline/commit/6d6844561f853498b985f4c8d041d7a413dfd48d)), closes [#313](https://github.com/johanpearson/Touchline/issues/313)

## [1.6.0](https://github.com/johanpearson/Touchline/compare/v1.5.0...v1.6.0) (2026-11-16)


### Features

* **commentary:** player-level commentary from action events in en and sv ([#179](https://github.com/johanpearson/Touchline/issues/179)) ([a6b710e](https://github.com/johanpearson/Touchline/commit/a6b710e2a20a1bb0118d9324f92df241a16f6d7f)), closes [#160](https://github.com/johanpearson/Touchline/issues/160)
* **engine:** action match loop with periods, goals and restarts ([#174](https://github.com/johanpearson/Touchline/issues/174)) ([219fbcd](https://github.com/johanpearson/Touchline/commit/219fbcd696ef8991b8eb48e18c8e905ba261aaca))
* **engine:** action stats and player ratings ([#177](https://github.com/johanpearson/Touchline/issues/177)) ([6dee47c](https://github.com/johanpearson/Touchline/commit/6dee47c9be29652ceda54a62db01d4da076f643a)), closes [#157](https://github.com/johanpearson/Touchline/issues/157)
* **engine:** add action event model, v2 input types and engineVersion dispatch ([#169](https://github.com/johanpearson/Touchline/issues/169)) ([36d1cad](https://github.com/johanpearson/Touchline/commit/36d1cad29169b05e93a6f88cffc3ba33c24f9ce8)), closes [#146](https://github.com/johanpearson/Touchline/issues/146)
* **engine:** ball carrier decisions and outcomes for open-play actions ([#172](https://github.com/johanpearson/Touchline/issues/172)) ([a824b0e](https://github.com/johanpearson/Touchline/commit/a824b0ed5ab0de73f378b08fef61355e1d2aaeae)), closes [#148](https://github.com/johanpearson/Touchline/issues/148)
* **engine:** changes and substitutions in the action engine ([#180](https://github.com/johanpearson/Touchline/issues/180)) ([f2f5215](https://github.com/johanpearson/Touchline/commit/f2f5215f2fb78e24e7321bd6da168faf9b380efc)), closes [#153](https://github.com/johanpearson/Touchline/issues/153)
* **engine:** fast path without snapshots and a 50 ms performance budget ([#181](https://github.com/johanpearson/Touchline/issues/181)) ([2d7a870](https://github.com/johanpearson/Touchline/commit/2d7a870bed890776c558feb351dfd063e4258ba5)), closes [#154](https://github.com/johanpearson/Touchline/issues/154)
* **engine:** make the action engine the default and remove the zone engine ([#218](https://github.com/johanpearson/Touchline/issues/218)) ([3ba75ad](https://github.com/johanpearson/Touchline/commit/3ba75ad76957fb558587695df363cf97791af9b5))
* **engine:** set pieces with engine-owned set-up positions ([#176](https://github.com/johanpearson/Touchline/issues/176)) ([4935411](https://github.com/johanpearson/Touchline/commit/493541164a7623ff426adf361a6fe15890f94d40)), closes [#151](https://github.com/johanpearson/Touchline/issues/151)
* **engine:** shots, xG and goalkeeper saves in the action engine ([#173](https://github.com/johanpearson/Touchline/issues/173)) ([bebae25](https://github.com/johanpearson/Touchline/commit/bebae25e6682a546dc3d9617d908f159af790c8b))
* **engine:** tactics and home advantage in the action engine ([#178](https://github.com/johanpearson/Touchline/issues/178)) ([f38edfc](https://github.com/johanpearson/Touchline/commit/f38edfccf303d7eaee0baa1d5d3e4239676eebb3))
* **engine:** team shape from formation, tactics, phase and ball position ([#171](https://github.com/johanpearson/Touchline/issues/171)) ([efef739](https://github.com/johanpearson/Touchline/commit/efef7396806a6cacd8d0c1d78e6b806dccd39015))
* **engine:** v2 balance harness and calibration to the target ranges ([#201](https://github.com/johanpearson/Touchline/issues/201)) ([b7a59a7](https://github.com/johanpearson/Touchline/commit/b7a59a721ad93898718d734e96da99a37bf38fac))
* **game:** half-time substitutions and tactics for the action engine ([#187](https://github.com/johanpearson/Touchline/issues/187)) ([3771da0](https://github.com/johanpearson/Touchline/commit/3771da0189b7b3d4c2ab46d404cff04bc4da6020)), closes [#159](https://github.com/johanpearson/Touchline/issues/159)
* **game:** record the real goal scorers of a match in the result ([#221](https://github.com/johanpearson/Touchline/issues/221)) ([572ed99](https://github.com/johanpearson/Touchline/commit/572ed991418bd0f567bb65d03f9466f124793890))
* **game:** v2 match input, engineVersion in results and save schema v4 ([#185](https://github.com/johanpearson/Touchline/issues/185)) ([e58a619](https://github.com/johanpearson/Touchline/commit/e58a619f1a4b82b004d35a5e6fbf656da75187d3))
* **match-view:** classic 2D pitch view interpolating engine position snapshots ([#195](https://github.com/johanpearson/Touchline/issues/195)) ([c4cf876](https://github.com/johanpearson/Touchline/commit/c4cf87695d1aaf527806f6b0d5e843a0e88c82fa)), closes [#163](https://github.com/johanpearson/Touchline/issues/163)
* **match-view:** feed the momentum terrain from action events through an adapter ([#191](https://github.com/johanpearson/Touchline/issues/191)) ([eaa1832](https://github.com/johanpearson/Touchline/commit/eaa18325f50676838c1eb5ff91bcb5e0f7750d8c))
* **match-view:** passing chains and set-piece line-ups on the 2D pitch ([#196](https://github.com/johanpearson/Touchline/issues/196)) ([3ed44ad](https://github.com/johanpearson/Touchline/commit/3ed44ada3a4f7b8f1efed5c6f4c9856c561217dd)), closes [#164](https://github.com/johanpearson/Touchline/issues/164)
* **ui:** action stats, key passes and player ratings in the match screen ([#192](https://github.com/johanpearson/Touchline/issues/192)) ([bdc7afe](https://github.com/johanpearson/Touchline/commit/bdc7afed6d4230260518704305b8846e9153c3d8)), closes [#162](https://github.com/johanpearson/Touchline/issues/162)


### Bug Fixes

* **ci:** keep the season time budget test out of npm test and Stryker ([#207](https://github.com/johanpearson/Touchline/issues/207)) ([d4c2953](https://github.com/johanpearson/Touchline/commit/d4c29532bd25a6db9a30b154a279def1f0a1b758))
* **engine:** keep players of a set-piece set-up apart ([#184](https://github.com/johanpearson/Touchline/issues/184)) ([3d18942](https://github.com/johanpearson/Touchline/commit/3d18942eedd2395f38f88f87c36af0305fcf137e)), closes [#175](https://github.com/johanpearson/Touchline/issues/175)
* **engine:** keep role players of a set-piece set-up apart ([#189](https://github.com/johanpearson/Touchline/issues/189)) ([ae71f01](https://github.com/johanpearson/Touchline/commit/ae71f01699fdd3db047ff6f840c5f5194bb06253)), closes [#183](https://github.com/johanpearson/Touchline/issues/183)
* **engine:** keep the ball carrier on the ball under the snapshot speed cap ([#200](https://github.com/johanpearson/Touchline/issues/200)) ([f429657](https://github.com/johanpearson/Touchline/commit/f42965771c2be8df1c2c19412cfccf46cbc73fe0)), closes [#197](https://github.com/johanpearson/Touchline/issues/197)
* **engine:** limit player speed between consecutive position snapshots ([#198](https://github.com/johanpearson/Touchline/issues/198)) ([203e5df](https://github.com/johanpearson/Touchline/commit/203e5df38bc9e95a85c4766d8be376a9663819f6)), closes [#194](https://github.com/johanpearson/Touchline/issues/194)
* **engine:** run the performance budget test alone so CI load cannot fail it ([#188](https://github.com/johanpearson/Touchline/issues/188)) ([8fc2a3f](https://github.com/johanpearson/Touchline/commit/8fc2a3f9d824d1b21e83643f60fb4b9810910681)), closes [#186](https://github.com/johanpearson/Touchline/issues/186)


### Performance Improvements

* **match-view:** adapt only new action events per playback tick ([#193](https://github.com/johanpearson/Touchline/issues/193)) ([c87cbe1](https://github.com/johanpearson/Touchline/commit/c87cbe1bdb5abfa3657935267a8b5ab4504e3120))

## [1.5.0](https://github.com/johanpearson/Touchline/compare/v1.4.0...v1.5.0) (2026-11-14)


### Features

* **engine:** apply team changes to a running match ([#134](https://github.com/johanpearson/Touchline/issues/134)) ([0face8e](https://github.com/johanpearson/Touchline/commit/0face8e3aa66e25f9869a7cab394bfd5e44b4c71)), closes [#119](https://github.com/johanpearson/Touchline/issues/119)
* **engine:** team tactics as engine modifiers ([#133](https://github.com/johanpearson/Touchline/issues/133)) ([27eb444](https://github.com/johanpearson/Touchline/commit/27eb4448a82c9b5ca3e68dc1b25064793f23cb67))
* **game:** derive team ratings from a lineup, formation and condition ([#136](https://github.com/johanpearson/Touchline/issues/136)) ([e54049d](https://github.com/johanpearson/Touchline/commit/e54049d7f34493263d0b4a0e7f97a877b683fae8)), closes [#122](https://github.com/johanpearson/Touchline/issues/122)
* **game:** formations, lineups with bench and auto-pick ([#135](https://github.com/johanpearson/Touchline/issues/135)) ([88e4ab8](https://github.com/johanpearson/Touchline/commit/88e4ab8af09a4e39784d4c0c01e72d7338463e1b)), closes [#121](https://github.com/johanpearson/Touchline/issues/121)
* **game:** half-time substitutions and tactic changes ([#141](https://github.com/johanpearson/Touchline/issues/141)) ([a70d748](https://github.com/johanpearson/Touchline/commit/a70d748f5ded4aeb1ace17af67e02838cd234e4f))
* **game:** player condition with fitness, form and effective attributes ([#131](https://github.com/johanpearson/Touchline/issues/131)) ([9d81b39](https://github.com/johanpearson/Touchline/commit/9d81b39fb7a9d1945874eb62ef66277e25bdb7bb)), closes [#120](https://github.com/johanpearson/Touchline/issues/120)
* **game:** squad plan and condition in the career, save schema v3 ([#137](https://github.com/johanpearson/Touchline/issues/137)) ([84a63a8](https://github.com/johanpearson/Touchline/commit/84a63a857d9568bc7798857d13ddf3cdc30b1265)), closes [#123](https://github.com/johanpearson/Touchline/issues/123)
* **game:** update fitness and form after each matchday and rotate AI lineups ([#138](https://github.com/johanpearson/Touchline/issues/138)) ([1093136](https://github.com/johanpearson/Touchline/commit/109313688049e3e793ac90ff75826c67f1c80d1c)), closes [#124](https://github.com/johanpearson/Touchline/issues/124)
* **ui:** half-time substitutions and tactic changes in the match view ([#142](https://github.com/johanpearson/Touchline/issues/142)) ([f8e533a](https://github.com/johanpearson/Touchline/commit/f8e533a4a64be6c1d0ff7269813d1a3869a08d32))
* **ui:** squad screen with lineup, bench, formation and tactics ([#140](https://github.com/johanpearson/Touchline/issues/140)) ([cb3942d](https://github.com/johanpearson/Touchline/commit/cb3942dbad30af36708fa4743fe6656ad313e544)), closes [#125](https://github.com/johanpearson/Touchline/issues/125)
* **ui:** swap a starter with a bench player in one step on the squad screen ([#143](https://github.com/johanpearson/Touchline/issues/143)) ([8990364](https://github.com/johanpearson/Touchline/commit/8990364f5a6541a5fd7d36ec3f7dcaa27bc263c6)), closes [#139](https://github.com/johanpearson/Touchline/issues/139)

## [1.4.0](https://github.com/johanpearson/Touchline/compare/v1.3.0...v1.4.0) (2026-11-14)


### Features

* **game:** validate untrusted career data ([#108](https://github.com/johanpearson/Touchline/issues/108)) ([3344772](https://github.com/johanpearson/Touchline/commit/334477225f4b145192d16c62a6ceb95fb73378e8))
* **platform:** add IndexedDB SaveStore passing the contract suite ([#110](https://github.com/johanpearson/Touchline/issues/110)) ([a77963a](https://github.com/johanpearson/Touchline/commit/a77963a61ff4864633726171279eae838754c0d9)), closes [#101](https://github.com/johanpearson/Touchline/issues/101)
* **platform:** export and import a save as a JSON file ([#112](https://github.com/johanpearson/Touchline/issues/112)) ([6d9ebc6](https://github.com/johanpearson/Touchline/commit/6d9ebc673c25eae87986b48bec61a75e22ff84a7)), closes [#102](https://github.com/johanpearson/Touchline/issues/102)
* **platform:** record the last-saved time in the save envelope ([#115](https://github.com/johanpearson/Touchline/issues/115)) ([97abaa1](https://github.com/johanpearson/Touchline/commit/97abaa114db8813d2025c5b75a3edbfe6f1374f2)), closes [#113](https://github.com/johanpearson/Touchline/issues/113)
* **platform:** versioned save codec with migration registry and frozen v1 fixture ([#111](https://github.com/johanpearson/Touchline/issues/111)) ([793ddfc](https://github.com/johanpearson/Touchline/commit/793ddfc872c39ccdb4ce56ebaba5271601871337)), closes [#100](https://github.com/johanpearson/Touchline/issues/100)
* **ui:** autosave the career and continue on startup ([#114](https://github.com/johanpearson/Touchline/issues/114)) ([4d42b8c](https://github.com/johanpearson/Touchline/commit/4d42b8c72aed6fadd359418fb3affc9ae2ededfa)), closes [#103](https://github.com/johanpearson/Touchline/issues/103)
* **ui:** export and import saves from the saves screen ([#117](https://github.com/johanpearson/Touchline/issues/117)) ([4c289a9](https://github.com/johanpearson/Touchline/commit/4c289a90808333080cf0f9033f60f9468fe0101c)), closes [#105](https://github.com/johanpearson/Touchline/issues/105)
* **ui:** saves screen with manual slots ([#116](https://github.com/johanpearson/Touchline/issues/116)) ([2d3da2a](https://github.com/johanpearson/Touchline/commit/2d3da2a35f9ab43eda7e83f436ee9d1d50c849f3))

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

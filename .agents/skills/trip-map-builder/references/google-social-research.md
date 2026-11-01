# Google Places + Instagram + X 调研工作流

## 前提

Google Places 是餐厅硬信号：评分、评价量、价位、类型、营业时间、地址是否落在当天区域。小红书、Instagram、X 只补近期体验、氛围和预警。

评分再高也不为一家店扭曲当天路线。只有预约餐、强目的餐、用户明确指定的店，才允许成为路线锚点。

X 上的新鲜闭店、停业或严重排队可以否掉一家候选。好看的照片不能把 Places 信号弱的店抬成绕路目的地。

某个来源没有可用结果时，写「无可用信号」，这顿饭仍然保留 2-3 个区域内候选。

## 密钥

从环境变量读取 `GOOGLE_PLACES_API_KEY`。没有就问用户一次。

不要把密钥写进 `~/.trip-map-builder/MEMORY.md`、技能仓库或生成的 HTML。

该密钥需要开通 Places API (New)。`reviews` 和 `reviewSummary` 属于 Atmosphere 字段，会计费。

## 搜索餐厅

围绕当天区域搜索。查询里写片区名，并带上目的地国家的 `regionCode`。`textQuery` 已经点名地点时，Places 会忽略 `locationBias`。

只有查询里没有片区、只剩菜系或餐次时，才用当天区域中心做圆形 `locationBias`，半径约 1500 米。

```bash
curl -s -X POST 'https://places.googleapis.com/v1/places:searchText' \
  -H 'Content-Type: application/json' \
  -H "X-Goog-Api-Key: $GOOGLE_PLACES_API_KEY" \
  -H 'X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.primaryType,places.googleMapsUri' \
  -d '{"textQuery":"银座 午餐","pageSize":5,"languageCode":"en","regionCode":"JP"}'
```

无片区的菜系查询：

```bash
curl -s -X POST 'https://places.googleapis.com/v1/places:searchText' \
  -H 'Content-Type: application/json' \
  -H "X-Goog-Api-Key: $GOOGLE_PLACES_API_KEY" \
  -H 'X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.primaryType,places.googleMapsUri' \
  -d '{"textQuery":"拉面","pageSize":5,"languageCode":"en","regionCode":"JP","locationBias":{"circle":{"center":{"latitude":35.6717,"longitude":139.7649},"radius":1500}}}'
```

`languageCode` 跟随这趟行程。旅行者要中文评价时用 `zh-CN`。

## 查看店铺详情

只对入围的 2-3 家拉详情。`places.id` 放进 URL。

```bash
curl -s "https://places.googleapis.com/v1/places/PLACE_ID" \
  -H "X-Goog-Api-Key: $GOOGLE_PLACES_API_KEY" \
  -H 'X-Goog-FieldMask: id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel,primaryTypeDisplayName,regularOpeningHours,googleMapsUri,reviews,reviewSummary'
```

`reviews` 最多 5 条。这是这个 API 的上限，所以还要看小红书、Instagram 和 X。`reviewSummary` 只作提示，不当最终判断。

## 判断标准

优先看：

- `rating`：基础稳定性
- `userRatingCount`：太少说明信号弱
- `priceLevel`：是否符合预算
- `primaryType` / `primaryTypeDisplayName`：是否适合当前这顿饭
- `formattedAddress` 和 `location`：是否落在当天区域
- `regularOpeningHours`：这天是否开门
- 评价里重复出现的排队、踩雷、游客店、值不值得专门去

`googleMapsUri` 写入地图数据的 `mapsUrl`。导航查询仍用原来的 `gmap` 字段。

## Instagram

Chrome 已登录 `instagram.com`，并装好 OpenCLI Browser Bridge。不要操作 Instagram 搜索框。`instagram search` 只搜账号。

按这个顺序：

```bash
opencli google search "site:instagram.com <店名> <片区>" --limit 5 -f json
opencli instagram user <handle> --limit 5 -f json
```

第一条找地点页或帖子 URL。结果里能确定官方账号时，再用第二条看最近帖子。

保留：店名、菜品、地址或地点标签对得上、有本人体验。丢掉纯空镜、广告和同名不同店。

代表链接写入 `instagram`：一条帖子、地点页或主页。

## X

Chrome 已登录 X，并装好 Browser Bridge。

```bash
opencli twitter search "\"<店名>\" <片区>" --filter live --limit 10 -f json
```

`--filter live` 用来抓近期闭店、排队和踩雷。保留第一人称、能对上这家店的帖子。丢掉广告、新闻合集、以及另一个城市的同名店。

代表链接写入 `x`：一条帖子 URL，或这条实时搜索的 `https://x.com/search?q=` 链接。

## 写回格式

每顿饭只保留 2-3 个候选。每个来源一行结论，不搬原文。

```md
午餐区域：银座
主推：店名 A
- Google：评分和评价量够，价位适合午餐，在区域内
- 小红书：近期反馈适合工作日，不用专门绕路
- Instagram：菜品清楚，拍照向但不是纯空镜
- X：近两周没有闭店或严重排队

备选：店名 B
- Google：评价量偏少，信号弱，只适合顺路
- 小红书：无可用信号
- Instagram：无可用信号
- X：无可用信号
```

## 常见坑

- 只按评分选店，不看它是否在当天区域
- 为了一家店反向规划半天路线
- 把 Instagram 或小红书的照片当成餐厅硬口碑
- 忽略排队、预约和营业时间
- 搜索词太泛，得到一堆游客店
- 查询里没有片区，结果跑到另一个城市的同名店
- 把 API 密钥写进记忆文件、仓库或地图页面

## 官方参考

- https://developers.google.com/maps/documentation/places/web-service/text-search
- https://developers.google.com/maps/documentation/places/web-service/place-details
- https://github.com/jackwener/OpenCLI/blob/main/docs/adapters/browser/instagram.md
- https://github.com/jackwener/OpenCLI/blob/main/docs/adapters/browser/twitter.md
- https://github.com/jackwener/OpenCLI/blob/main/docs/adapters/browser/google.md

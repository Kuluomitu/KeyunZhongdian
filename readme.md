# 重点旅客信息系统

基于 Vue 3 + Electron 的重点旅客信息管理系统。

## 开发指南

### 安装依赖

```bash
yarn install
```

### 开发模式

```bash
# 启动 Vite 开发服务器
yarn dev

# 在另一个终端启动 Electron
yarn electron:dev
```

### 构建应用

```bash
yarn electron:build
```

## 项目功能

1. 主页面展示各个车次对应的重点旅客，并且可以登记旅客信息
2. 车次信息展示页面：展示一个可以导入的车次信息 Excel
3. 重点旅客信息展示页面：展示一个重点旅客登记的相关信息
4. 提醒功能：在车次即将开车时，弹窗提醒并展示所有需要服务的旅客

补充信息：
有一个车次信息表，各个字段为：
序号  担当局 车次  运行区间    运行区间    到点  开点  股道  站台  站停  车型  定员  编组  检票口 开检时间    检票上岗时间  站台上岗时间  立折时间    给水作业    吸污  行包作业    备注
有一个重点旅客信息登记表，各个字段为：
序号  日期  车次  姓名  类别  服务  同行人数    牌号  备注
主页面展示的信息根据车次关联起来

框架：
vue3 electron typescript

使用平台：
windows单机桌面端应用

开发工具：
yarn

## 运行方式

在一个命令行运行vue
```
yarn run dev
```
在一个命令行运行 electron
```
yarn run electron:dev
```


todo list

+ [ ] 首页，该删除未删除红，车到点黄色，
+ [ ] 旅客信息 和 首页 的信息独立开   

类别：军，老，病，残，儿童
今日待办：今日重点旅客数，已服务重点旅客数
首页的离厅操作是已服务的重点旅客，点击离厅，已服务的重点旅客加一，旅客信息里面的信息是留存新增旅客的信息
号牌不能重复逻辑只针对同一天的重点旅客。
开检提醒的逻辑修改为如下：分为始发车，通过车，终到车；Excel表中如果D行的运行区间为西安，则为始发车，E行的运行区间为西安则为终到车，其余都为通过车。始发车里车次为T和K开头的列车提前33分钟开始提醒，C开头和D开头的列车提前23分钟开检提醒。通过车全部提前3分钟开检提醒。终到车只显示到达时间，没有开检提醒。如遇到无法识别的车次则提取23分钟提醒。
导入的Excel表有两个运行区间，一个是D行，一个为F行，漏了F行的运行区间
A列为日期，B列为车次，C列为姓名，D列为服务，F列为服务人员，G列为同行人员，H列为牌号，I列为备注
其他按照时间来排序（开检时间和到站时间一起排序），没有开检时间和到站时间的排在最上面>临近开检时间的显示在最上面>当天未到开检时间的和未到到站时间的>第二天凌晨12点到1点的>已经过开检时间的。通过车和始发车的开检时间与终到车的到站时间排序
第二天凌晨1点以前的车都在第一天也会显示
没有开检时间和到站时间的旅客排在最上面
临近开检时间的旅客显示在第二位
当天未到开检时间和未到到站时间的旅客排在第三位
第二天凌晨12点到1点的旅客排在第四位
已过开检时间的旅客排在最后
修改备注再上传不会影响
终到车使用到站时间
非终到车使用开检时间
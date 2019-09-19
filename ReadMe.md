本项目用于监控EOS的RAM交易记录。 
  
## 运行步骤
1、到 [https://www.blockdog.com/form](https://www.blockdog.com/form) 去申请apikey;  
2、将申请到的apikey设置到src/config.js文件的apikey字段中;  
3、用npm install命令安装相关依赖包(请先安装nodejs,nodejs最好用最新版);  
4、用npm run serve命令启动node服务器，会先同步最近的ram交易数据;  
5、[可选] 用npm run client命令启动node客户端;  
  
## 客户端的show命令  
用npm run client命令启动node客户端后，就可以使用show命令了。show命令显示最近的交易记录，该命令最多携带2个参数，举例如下: 
```
show 显示最近的10条交易记录
show 100 显示最近的100条交易记录
show 10 1000 显示最近的10条交易记录，而且交易的EOS数量大于等于1000
```
## 客户端的watch命令
用npm run client命令启动node客户端后，就可以使用watch命令了。watch命令用于监视ram交易记录，该命令最多携带1个参数，举例如下:
```
watch 监视所有的ram交易记录
watch 10 监视EOS数量大于等于10的交易记录
watch 1000 监视EOS数量大于等于1000的交易记录
```
可以使用stop命令停止监视。

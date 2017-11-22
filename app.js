'use strict'

const express = require('express')

//引入post请求体解析
const bodyParser = require('body-parser')
	//引入数据库对象
const mysql = require('mysql')

//解析上传文件的包
const formidable = require('formidable')

//文件功能增强的包
const fse = require('fs-extra');

const path = require('path')

const pool = mysql.createPool({
	connectionLimit: 10,
	host: '127.0.0.1',
	user: 'root',
	password: 'yanglinxu',
	database: 'album'
})

//创建服务器
let app = express()

//配置模板引擎
app.engine('html', require('express-art-template'))

//配置路由规则
let router = express.Router()

//测试路由
router.get('/text', (req, res, next) => {
		pool.getConnection(function(err, connection) {
			connection.query('SELECT * FROM album_dir', function(errors, results, fileds) {
				connection.release()
				if (err) {
					throw err
				}
				res.render('test.html', {
					data: results
				})
			})
		})
	})
	//进行首页渲染
	.get('/', (req, res, next) => {
		//获取连接
		pool.getConnection((err, connection) => {
			//处理获取连接时的异常，比如停网了
			if (err) return next(err);
			//使用连接查询所有的album_dir所有数据
			connection.query('select * from album_dir', (error, results) => {
				//查询完毕以后，释放连接
				connection.release();

				//处理查询时带来的异常，比如表名错误
				if (error) return next(error);
				res.render('index.html', {
					album: results
				})
			})
		})
	})
	//点击相册进入对应页面
	.get('/showPic', (req, res, next) => { //回调函数内的参数顺序不能写错...
		//获取传递过来的参数
		let dirname = req.query.dir
			// console.log(dirname)
			//并从数据库中查找对应图片显示
		pool.getConnection((err, connection) => {
			//处理获取连接时的异常，比如停网了
			if (err) return next(err)
				//使用连接查询所有的album_dir所有数据
			connection.query('select * from album_file where dir =?', [dirname], (err, results) => {
				//查询完毕以后，释放连接
				connection.release()
					//处理查询时带来的异常，比如表名错误
				if (err) return next(err)
					// console.log(results) [{ file: '123', dir: 'aaa' } ]
					//记录相册名
				res.render('album.html', {
					album: results,
					dir: dirname
				})
			})

		})
	})
	//添加目录
	.post('/addDir', (req, res, next) => {
		let dirname = req.body.dirname //必须引入body-parser才能使用
			// console.log(dirname)
			//连接数据库，将dirname写入数据库中
		pool.getConnection((err, connection) => {
			//处理获取连接时的异常，比如停网了
			if (err) return next(err);
			//使用连接查询所有的album_dir所有数据
			connection.query('insert into album_dir values (?)', [dirname], (error, results) => {
				//查询完毕以后，释放连接
				connection.release();
				//处理查询时带来的异常，比如表名错误
				if (err) return next(err);

				//重新加载首页
				res.redirect('/')
			})
		})
	})
	//添加照片
	//--首先点击添加按钮，将图片上传到对应目录
	//并且将文件的路径添加到数据库中

.post('/addPic', (req, res, next) => {
	var form = new formidable.IncomingForm()

	// let dir = req.body.dir
	// console.log(dir) 当表单类型是form-data时，无法通过req.body.dir获取

	let rootPath = path.join(__dirname, 'resource')
	form.uploadDir = rootPath
	form.parse(req, function(err, fields, files) {
		if (err) return next(err)

		// console.log(fields)//获取的是表单请求体中数据，是对象形式
		// console.log(files)//是一个对象，pic也是一个对象
		//获取文件上传后的名字
		let filename = path.parse(files.pic.path).base

		//获取文件进入对应文件夹后的最终路径
		let dist = path.join(rootPath, fields.dir, filename)

		//移动文件
		fse.move(files.pic.path, dist, (err) => {
			if (err) return next(err)
				// console.log('success')



			//将对应文件路径保存进数据库
			let db_file = `/resource/${fields.dir}/${filename}`
			let db_dir = fields.dir

			pool.getConnection((err, connection) => {
				//处理获取连接时的异常，比如停网了
				if (err) return next(err);
				//使用连接查询所有的album_dir所有数据
				connection.query('insert into album_file values (?,?)', [db_file, db_dir], (error, results) => {

					//查询完毕以后，释放连接
					connection.release();
					//处理查询时带来的异常，比如表名错误
					if (err) return next(err);
					//重定向到看相片的页面
					res.redirect('/showPic?dir=' + db_dir);
				})
			})
		})



	})
})



//暴露静态资源
app.use('/public', express.static('./public'))

//向外暴露相片静态资源目录
app.use('/resource',express.static('./resource'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
	extended: false
}));
// parse application/json
app.use(bodyParser.json());

app.use(router)

// 错误处理中间件
app.use((err, req, res, next) => {
	console.log('出错啦.-------------------------');
	console.log(err);
	console.log('出错啦.-------------------------');
	res.send(`
            您要访问的页面出异常拉...请稍后再试..
            <a href="/">去首页玩</a>
    `);
})

app.listen(8080, () => {
	console.log('start')
})
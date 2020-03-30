const express = require('express')
const bodyParser = require('body-parser')
const mysql = require('mysql')
const app = express()
const jwt = require('jsonwebtoken')
const session = require('express-session');

const secretKey = 'thisisverysecretkey'

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: "db_pasien"
})

db.connect((err) => {
    if (err) throw err
    console.log('Database connected')
})

//token
const isAuthorized = (request, result, next) => {

    if (typeof(request.headers['x-api-key']) == 'undefined') {
        return result.status(403).json({
            success: false,
            message: 'Unauthorized. Token is not provided'
        })
    }


    let token = request.headers['x-api-key']

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return result.status(401).json({
                success: false,
                message: 'Unauthorized. Token is invalid'
            })
        }
    })

   
    next()
}

//login admin
app.post('/login/admin', (request, result) => {
    let data = request.body
    var username = data.username;
    var password = data.password;

    if ( username && password) {
        db.query('SELECT * FROM admin WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {

            if (results.length > 0) {
                let token = jwt.sign(data.username + '|' + data.password, secretKey)

                result.json ({
                success: true,
                message: 'Login berhasil, hallo admin!',
                token: token
            });
        
            } else {
                result.json ({
                success: false,
                message: 'username atau password anda salah!!'
            });

            }
            result.end();
        });
    }
});

//registrasi admin
app.post('/registrasi/admin', (request, result) => {
    let data = request.body

    let sql = `
        insert into admin (nama_admin, username, password)
        values ('`+data.nama_admin+`', '`+data.username+`', '`+data.password+`');
    `

    db.query(sql, (err, result) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Registrasi berhasil'
    })
})

//login user
app.post('/login/user', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	if (username && password) {
		db.query('SELECT * FROM user WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			if (results.length > 0) {
				request.session.loggedin = true;
				request.session.username = username;
				response.redirect('/inap');
			} else {
				response.send('Username dan/atau Password salah!');
			}			
			response.end();
		});
	} else {
		response.send('Masukkan Username and Password!');
		response.end();
	}
});

//registrasi user
app.post('/registrasi/user', (request, result) => {
    let data = request.body

    let sql = `
        insert into user (nama_user, username, password, alamat, kontak)
        values ('`+data.nama_user+`', '`+data.username+`', '`+data.password+`', '`+data.alamat+`', '`+data.kontak+`');
    `

    db.query(sql, (err, result) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Registrasi berhasil'
    })
})

/*================================================ CRUD PASIEN ====================================================*/

//read data pasien
app.get('/pasien', isAuthorized, (req, res) => {
    let sql = `
        select * from pasien
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            success: true,
            message: 'Data berhasil diambil dari database',
            data: result
        })
    })
})

    //get (id)
    app.get('/pasien/:id', isAuthorized, (req, res) => {
        let sql = `
        select nama_pasien, alamat, usia, tanggal_masuk, penyakit from pasien
        where pasien.id = '`+req.params.id+`'
        `

        db.query(sql, (err, result) => {
            if (err) throw err

            res.json({
                success: true,
                message: 'Data berhasil diambil dari database sesuai id',
                data: result
            })
        })
    })

//add data pasien
app.post('/pasien', isAuthorized, (req, result) => {
    data = req.body

    data.forEach(element => {
        
        db.query(`
        insert into pasien (nama_pasien, alamat, usia, tanggal_masuk, penyakit)
        values ('`+element.nama_pasien+`', '`+element.alamat+`', '`+element.usia+`', '`+element.tanggal_masuk+`', 
        '`+element.penyakit+`')
        `, 
        (err, result) => {
            if (err) throw err
        })
    });

    result.json({
        success: true,
        message: 'Data pasien berhasil ditambahkan'
    })
})

//update data pasien
app.put('/pasien/:id', isAuthorized, (req, result) => {
    let data = req.body

    let sql = `
        update pasien
        set nama_pasien = '`+data.nama_pasien+`', alamat = '`+data.alamat+`', usia = '`+data.usia+`', 
        tanggal_masuk = '`+data.tanggal_masuk+`', penyakit = '`+data.penyakit+`'
        where id = `+req.params.id+`
   `

    db.query(sql, (err, result) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Data berhasil diubah'
    })
})

//delete data pasien
app.delete('/pasien/:id', isAuthorized, (request, result) => {
    let sql = `
        delete from pasien where id = `+request.params.id+`
    `

    db.query(sql, (err, res) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Data berhasil dihapus'
    })
})

/*================================================ Upd Dlt USER ===================================================*/

//update data user
app.put('/user/:id', isAuthorized, (req, result) => {
    let data = req.body

    let sql = `
        update user
        set nama_user = '`+data.nama_user+`', username = '`+data.username+`', password = '`+data.password+`', 
        alamat = '`+data.alamat+`', kontak = '`+data.kontak+`'
        where id = `+req.params.id+`
   `

    db.query(sql, (err, result) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Data berhasil diubah'
    })
})

//delete data pasien
app.delete('/user/:id', isAuthorized, (request, result) => {
    let sql = `
        delete from user where id = `+request.params.id+`
    `

    db.query(sql, (err, res) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Data berhasil dihapus'
    })
})

/*=============================================== CRUD KAMAR ======================================================*/
//read data kamar
app.get('/kamar', isAuthorized, (req, res) => {
    let sql = `
        select * from kamar
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            success: true,
            message: 'Data berhasil diambil dari database',
            data: result
        })
    })
})

//add data kamar
app.post('/kamar', isAuthorized, (req, result) => {
    data = req.body

    data.forEach(element => {
        
        db.query(`
        insert into kamar (class, jumlah)
        values ('`+element.class+`', '`+element.jumlah+`')`
        , 
        (err, result) => {
            if (err) throw err
        })
    });

    result.json({
        success: true,
        message: 'Data kamar berhasil ditambahkan'
    })
})

//update data kamar
app.put('/kamar/:id', isAuthorized, (req, result) => {
    let data = req.body

    let sql = `
        update kamar
        set class = '`+data.class+`', jumlah = '`+data.jumlah+`'
        where id = `+req.params.id+`
   `

    db.query(sql, (err, result) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Data berhasil diubah'
    })
})

//delete data kamar
app.delete('/kamar/:id', isAuthorized, (request, result) => {
    let sql = `
        delete from kamar where id = `+request.params.id+`
    `

    db.query(sql, (err, res) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Data berhasil dihapus'
    })
})

/*=============================================== CRUD INAP ======================================================*/

//tambah pasien inap
app.post('/inap', isAuthorized, (req, res) => {
    let data = req.body

    db.query(`
        insert into inap (pasien_id, kamar_id, no_ruangan)
        values ('`+data.pasien_id+`', '`+data.kamar_id+`', '`+data.no_ruangan+`')
    `, 
    
    (err, result) => {
        if (err) throw err
    })

    // mengubah stock pada table laptop, apabila ada transaksi maka stock akan mengurang satu
    db.query(`
        update kamar
        set jumlah = jumlah - 1
        where id = '`+data.kamar_id+`'`
        
        , (err, result) => {
        if (err) throw err
    })

    res.json({
        message: "Pasien inap behasil ditambahkan"
    })
})

//read pasien inap(id)
app.get('/inap', (req, res) => {
    db.query(`
        select pasien.nama_pasien, pasien.alamat, pasien.usia, 
        pasien.tanggal_masuk, kamar.class, no_ruangan 
        from pasien
        right join inap on pasien.id = inap.pasien_id
        right join kamar on inap.kamar_id = kamar.id
    `, (err, result) => {
        if (err) throw err

        res.json({
            message: "berhasil",
            data: result
        })
    })
})

//read pasien inap(id)
app.get('/inap/:id', (req, res) => {
    db.query(`
        select pasien.nama_pasien, pasien.alamat, pasien.usia, 
        pasien.tanggal_masuk, kamar.class, no_ruangan 
        from pasien
        right join inap on pasien.id = inap.pasien_id
        right join kamar on inap.kamar_id = kamar.id
        where inap.id = '`+req.params.id+`'
    `, (err, result) => {
        if (err) throw err

        res.json({
            message: "berhasil",
            data: result
        })
    })
})

//update pasien inap
app.put('/inap/:id', isAuthorized, (req, res) => {
    let data = req.body

    let sql = `
        update inap
        set pasien_id = '`+data.pasien_id+`', kamar_id = '`+data.kamar_id+`'
        where id = '`+req.params.id+`'
    `
    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "Data berhasil diubah",
            data: result
        })
    })
})

//delete
app.delete ('/inap/:id/:kamar_id', isAuthorized, (req, res) => {
    let data = req.body

    db.query(`
        delete from inap where id = `+req.params.id+`
    `    
    , (err, result) => {
        if (err) throw err
    })

    db.query(`
        update kamar
        set jumlah = jumlah + 1
        where id = '`+req.params.kamar_id+`'
    `    
    , (err, result) => {
        if (err) throw err
        
        res.json({
            message: "Data berhasil dihapus",
            data: result
        })
    })
})

// port untuk menjalankan program
app.listen(8020, () => {
    console.log('running on port 8020')
})
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var play = require('play').Play();

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var voted = {
  // example:
  // '192.168.0.12': {liked: ['3', '1'], disliked: ['1']}
};

var MUSICS_PATH = process.env.MUSICS_PATH || '/home/pi/musics/';

var playlistPaths = {
  '1': path.join(MUSICS_PATH, 'Epic Sax Guy _.m4a'),
  '2': path.join(MUSICS_PATH, '1-03 Old Love _ New Love.m4a'),
  '3': path.join(MUSICS_PATH, '3005 - Childish Gambino.m4a'),
  '4': path.join(MUSICS_PATH, '02 Walking On a Dream 1.m4a'),
  '5': path.join(MUSICS_PATH, 'badswap.wav'),
  '6': path.join(MUSICS_PATH, '08 Men In Black 1.m4a'),
  '7': path.join(MUSICS_PATH, 'beatboxing flute super mario brothers theme.m4a'),
  '8': path.join(MUSICS_PATH, 'Things Went Down.m4a')
};

var db = { playlist: {
  current: {
    id: '3',
    name: 'Super Mario Bros. Theme',
    img: 'https:\/\/upload.wikimedia.org\/wikipedia\/en\/9\/99\/MarioSMBW.png',
    artist: 'Gregg Pollack',
    playing: false
  },
  following: [
    {
      id: '7',
      name: 'From Time',
      img: 'http:\/\/netstorage.metrolyrics.com\/albums\/1378405711drake-nothing-was-the-same-artwork-2.jpg',
      artist: 'Drake ft. Jhene Aiko',
      likes: 5,
      dislikes: 2
    },
    {
      id: '2',
      name: 'Childish Gambino',
      img: 'http:\/\/cdn.pigeonsandplanes.com\/wp-content\/uploads\/2013\/12\/childish21-406x400.jpg',
      artist: null,
      likes: 3,
      dislikes: 2
    },
    {
      id: '1',
      name: 'Price Tag',
      img: 'http:\/\/www.jessiejofficial.com\/files\/2014\/10\/jessie-j-who-you-are.jpg',
      artist: 'Jessie J ft. B\'o.B',
      likes: 3,
      dislikes: 3
    },
    {
      id: '6',
      name: 'Hello World',
      img: 'http:\/\/medias.2kmusic.com\/uploads\/2014\/01\/03\/img-1388766574-23e5e9ed86c330e05fb8b20d0983cff8.jpg',
      artist: 'Kid Ink',
      likes: 3,
      dislikes: 4
    },
    {
      id: '4',
      name: 'Doctor Who Theme',
      img: 'http:\/\/img4.wikia.nocookie.net\/__cb20130125153635\/supersmashbrosgmod\/images\/0\/09\/LuigiSMBW.jpg',
      artist: null,
      likes: 4,
      dislikes: 5
    },
    {
      id: '5',
      name: 'Touch The Sky',
      img: 'http:\/\/upload.wikimedia.org\/wikipedia\/en\/7\/70\/Graduation_(album).jpg',
      artist: 'Kanye West',
      likes: 2,
      dislikes: 3
    },
    {
      id: '8',
      name: 'Nightbook',
      img: null,
      artist: 'Ludovico Einaudo',
      likes: 3,
      dislikes: 5
    }
  ]
}};

function sortSongs(s1, s2) {
  var score1 = s1.likes - s1.dislikes,
    score2 = s2.likes - s2.dislikes;
  return score1 === score2 ? 0 :
      (score1 < score2 ? 1 : -1); // Sort in descending score
}

function handlePlaysound() {
  console.log('launching song');
  db.playlist.current.playing = true;
  play.sound(playlistPaths[db.playlist.current.id], handlePlaysound);

  console.log('choosing next song');
  db.playlist.current = db.playlist.following[0];
  db.playlist.following.splice(0, 1);  // Removes the first song

  if (0 === db.playlist.following.length) return;
}

app.get('/playlist', function(req, res, next) {
  voted[req.ip] = voted[req.ip] || {liked: [], disliked: []};
  var liked = voted[req.ip].liked,
    disliked = voted[req.ip].disliked;

  for (var id in liked) {
    var song = db.playlist.following[id];
    song.hasLiked = true;
  }
  for (var id in disliked) {
    var song = db.playlist.following[id];
    song.hasDisliked = true;
  }
  res.status(200).json(db);
});

app.get('/launch', function(req, res, next) {
  if (!db.playlist.current.playing) {
    handlePlaysound();
  }
  res.status(200).send('ok');
});

function findIn(arr, id) {
  var i,
    foundElement,
    len = arr.length;

  for (i = 0, foundElement; foundElement = arr[i]; ++i) {
    if (foundElement === id || foundElement.id === id) return foundElement;
  }

  return false;
}

app.put(/\/(dis)?like\/([^\/]+)/, function(req, res, next) {
  var song,
    votes,
    like = req.path.match(/^\/like\/.*$/),
    id = req.params[1];

  voted[req.ip] = voted[req.ip] || {liked: [], disliked: []};
  votes = like ? voted[req.ip].liked : voted[req.ip].disliked;

  song = findIn(db.playlist.following, id);
  if (!song) return res.status(404).send('No such song: ' + id);

  if (findIn(votes, id)) {
    return res.status(403).send('Already ' + (like ? '' : 'dis')
        + 'liked song: ' + id);
  }

  if (like) ++song.likes;
  else song.dislikes++;

  votes.push(song.id);

  db.playlist.following.sort(sortSongs);
  return res.status(200).send();
});

app.put(/\/un(dis)?like\/([^\/]+)/, function(req, res, next) {
  var song,
    votes,
    unlike = req.path.match(/^\/unlike\/.*$/),
    id = req.params[1];

  voted[req.ip] = voted[req.ip] || {liked: [], disliked: []};
  votes = unlike ? voted[req.ip].liked : voted[req.ip].disliked;

  song = findIn(db.playlist.following, id);
  if (!song) return res.status(404).send('No such song: ' + id);

  if (!findIn(votes, id)) {
    return res.status(403).send('Did not yet ' + (unlike ? '' : 'dis')
        + 'liked song: ' + id);
  }

  if (unlike) --song.likes;
  else --song.dislikes;

  for (var el, i = 0; el = votes[i]; ++i) {
    if (id === el) {
      votes.splice(i, 1);
      break;
    }
  }

  db.playlist.following.sort(sortSongs);
  return res.status(200).send(); 
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send('error: ' + err.message);
});


module.exports = app;

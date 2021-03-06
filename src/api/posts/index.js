import Router from 'koa-router';
import checkLoggedIn from '../../lib/checkLoggedIn';
import * as postCtrl from './post.ctrl';

const posts = new Router();

//posts 라우트에 여러중료유의 라우트를 설정한후 모두 printInfo 함수를 호출하도록 설정(next 미들웨어)
posts.get('/', postCtrl.list); //정보를 요청
posts.post('/', checkLoggedIn, postCtrl.write);

const post = new Router(); // api/posts/:id

post.get('/', postCtrl.read);
post.delete('/', checkLoggedIn, postCtrl.checkOwnPost, postCtrl.remove);
post.patch('/', checkLoggedIn, postCtrl.checkOwnPost, postCtrl.update);

posts.use('/:id', postCtrl.getPostById, post.routes());
export default posts;

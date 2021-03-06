import mongoose from 'mongoose';
import Joi from '../../../node_modules/joi/lib/index';
import Post from '../../models/post';

// objectID 검증 모듈 생성
const { ObjectId } = mongoose.Types;

export const getPostById = async (ctx, next) => {
  const { id } = ctx.params;
  if (!ObjectId.isValid(id)) {
    ctx.status = 400;
    return;
  }
  try {
    const post = await Post.findById(id);
    //포스트가 존재하지 않을때
    if (!post) {
      ctx.status = 404;
      return;
    }
    ctx.state.post = post;
    return next();
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const checkOwnPost = (ctx, next) => {
  const { user, post } = ctx.state;
  if (post.user._id.toString() !== user._id) {
    ctx.status = 403;
    return;
  }
  return next();
};

/* 포스트작성
POST/ api/post
{title, body}
*/
export const write = async (ctx) => {
  // 객체검증
  const schema = Joi.object().keys({
    title: Joi.string().required(),
    body: Joi.string().required(),
    tags: Joi.array().items(Joi.string()).required(),
  });
  // 검증하고 나서 검증 실패인 경우 에러 처리
  const result = schema.validate(ctx.request.body);
  if (result.error) {
    ctx.status = 400;
    ctx.body = result.error;
    return;
  }
  //REST API 의 Request bodysms ctx.request.body에서 조회 가능합니다.
  const { title, body, tags } = ctx.request.body;
  const post = new Post({
    title,
    body,
    tags,
    user: ctx.state.user,
  });
  try {
    await post.save(); //데이터 베이스에 저장
    ctx.body = post;
  } catch (e) {
    ctx.throw(500, e);
  }
};

/* 포스트 목록 조회
GET / api/posts
*/

export const list = async (ctx) => {
  const page = parseInt(ctx.query.page || '1', 10);
  if (page < 1) {
    ctx.status = 400;
    return;
  }
  // username, tags로 포스트 필링하기
  const { tag, username } = ctx.query;
  //tag, username 값이 유효하면 객체 안에 넣고, 그렇지 않으면 넣지 않음
  const query = {
    ...(username ? { 'user.username': username } : {}),
    ...(tag ? { tags: tag } : {}),
  };

  try {
    const posts = await Post.find(query)
      .sort({ _id: -1 }) //포스트 정렬
      .limit(10) //개수제한
      .skip((page - 1) * 10)
      .exec();
    //마지막 페이지 알려주기
    const postCount = await Post.countDocuments(query).exec();
    ctx.set('Last-page', Math.ceil(postCount / 10));

    ctx.body = posts
      .map((post) => post.toJSON()) // 내용 길이 제한
      .map((post) => ({
        ...post,
        body:
          post.body.length < 200 ? post.body : `${post.body.slice(0, 200)} ...`,
      }));
  } catch (e) {
    ctx.throw(500, e);
  }
};

/* 특정 포스트 조회
GET/ api/post/:id
*/
export const read = async (ctx) => {
  ctx.body = ctx.status.post;

  // const { id } = ctx.params;
  // //주어진 id 값으로 포스트를 찾습니다.
  // //파라미터로 받아 온 값은 문자열 형식이므로 파라미터를 숫자로 변환하거나 비교ㅎㄹ p.id값을 문자열로 변경해야합니다.
  // try {
  //   const post = await Post.findById(id).exec();
  //   //포스트가 없으면 오류를 반환
  //   if (!post) {
  //     ctx.status = 404;
  //     ctx.body = {
  //       message: '포스트가 존재하지 않습니다.',
  //     };
  //     return;
  //   }
  //   ctx.body = post;
  // } catch (e) {
  //   ctx.throw(500, e);
  // }
};

// /*특정 포스트 제거
// DELETE /api/posts/:id
// */
export const remove = async (ctx) => {
  const { id } = ctx.params;
  //해당 id를 가진 post가 몇번쨰 인지 확인
  try {
    await Post.findByIdAndRemove(id).exec();
    ctx.status = 204;
  } catch (e) {
    ctx.throw(500, e);
  }
};

// /*포스트 수정
// PUT /api/posts/:id
// {title, body}
// */
// export const replace = (ctx) => {
//   //PUT 메서드는 전체 포스트 정보를 입력하여 데이터를 통채로 교체할 떄 사용합니다.
//   const { id } = ctx.params;
//   //해당 아디리르 가진 post가 몇변째 인지 확인합니다.
//   const index = posts.findIndex((p) => p.id.toString() === id);
//   //포스트가 없으면 오류를 반환
//   if (index === -1) {
//     ctx.status = 404;
//     ctx.body = {
//       message: '포스트가 존재 하지 않습니다.',
//     };
//     return;
//   }

//   // 전체 객체를 덮어 씌웁니다.
//   //따라서 id를 제외한 기존 정보를 날리고, 객체를 새로 만듭니다.
//   posts[index] = {
//     id,
//     ...ctx.request.body,
//   };
//   ctx.body = posts[index];
// };

// /* 포스트 수정(특정 필드 변경)
// PATCH /api/post/:id
// {title, body}
// */

export const update = async (ctx) => {
  //PATCH 메서드는 주어진 필드만 교체합니다.
  const { id } = ctx.params;

  // 객체 검증
  const schema = Joi.object().keys({
    title: Joi.string(),
    body: Joi.string(),
    tags: Joi.array().items(Joi.string()),
  });
  // 검증하고 나서 검증 실패인 경우 에러 처리
  const result = schema.validate(ctx.request.body);
  if (result.error) {
    ctx.status = 400;
    ctx.body = result.error;
    return;
  }
  try {
    const post = await Post.findByIdAndUpdate(id, ctx.request.body, {
      new: true, //업데이트된 데이터를 반환
    }).exec();
    if (!post) {
      ctx.status = 404;
      ctx.body = {
        message: '포스트가 존재 하지 않습니다.',
      };
      return;
    }
    ctx.body = post;
  } catch (e) {
    ctx.throw(500, e);
  }
};

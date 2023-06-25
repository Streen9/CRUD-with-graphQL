import './App.css';
import { ApolloClient, ApolloProvider, InMemoryCache, gql, useQuery, useMutation } from '@apollo/client';
import React, {  useRef } from "react";


const client = new ApolloClient({
  uri: 'http://localhost:4000/graphql',
  cache: new InMemoryCache(),
})

const GET_POSTS = gql`
query getPosts{
  posts{
    id
    title
    content
  }
}`;

const CREATE_POST = gql`
  mutation CreatePost($title: String!, $content: String!) {
    createPost(title: $title, content: $content) {
      id
      content
    }
  }
`;

const DELETE_POST = gql`
  mutation DeletePost($id : ID!){
    deletePost( id : $id ) {
      id
    }
  }
`;

function App() {
  const {loading, error, data} = useQuery(GET_POSTS);
  const [ createPost ] = useMutation(CREATE_POST);
  const [deletePost] = useMutation(DELETE_POST);

  const titleRef = useRef(null);
  const contentRef = useRef(null);

  const handleCreatePost = () => {
    createPost({
      variables: {
        title: titleRef.current.value,
        content: contentRef.current.value,
      },
    })
      .then((response) => {
        console.log(response.data);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const handleDeletePost = (postId) => {
    console.log(postId,"id")
    deletePost({
      variables: {
        id : postId,
      },
      update: (cache) => {
        const existingPosts = cache.readQuery({ query: GET_POSTS });
        const updatedPosts = existingPosts.posts.filter((post) => post.id !== postId);
        cache.writeQuery({
          query: GET_POSTS,
          data: {
            posts: updatedPosts,
          },
        });
      },
    })
    .then((response) => {
      console.log(response.data);
    })
    .catch((error) => {
      console.error(error)
    });
  }
  if(loading) return <p>Loading....</p>
  if(error) return <p>Error: {error.message}</p>

  return (
    <div className="postMain">
    
    {data.posts.map((post) => (
      <div className="postsList row" key={post.id}>
        <div className="col-md-5 col-sm-5 col-12">
          <div className="card mb-3">
            <div className="card-body">
              <h2 className="card-title">{post.title}</h2>
              <p className="card-text">{post.content}</p>
            </div>
          </div>
        </div>
        <div className="col-md-2 col-sm-2 col-12 text-sm-right">
          <button className="btn btn-dark" onClick={() => handleDeletePost(post.id)}>Delete Post</button>
        </div>
      </div>
    ))}


    <form className="form">
      <div className="mb-3">
        <label htmlFor="title" className="form-label">Title</label>
        <input ref={titleRef} type="text" className="form-control" id="title" placeholder="Enter title" />
      </div>
      <div className="mb-3">
        <label htmlFor="content" className="form-label">Post Content</label>
        <textarea ref={contentRef} className="form-control" id="content" placeholder="Enter post content"></textarea>
      </div>
      <button onClick={handleCreatePost} className="btn btn-primary">Create Post</button>
    </form>
    </div>
  );
  
}

function AppWithApollo(){
  return(
    <ApolloProvider client={client}>
      <App/>
    </ApolloProvider>
  );
}

export default AppWithApollo;

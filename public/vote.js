upPost = [];
downPost = [];
upComment = [];
downComment = [];

function upvotePost(id, elem){
  elem.nextElementSibling.nextElementSibling.firstElementChild.src = "/img/downfalse.png";
  elem.firstElementChild.src = "/img/uptrue.png";
  vote("/upvote/p/"+id);



  if(typeof(upPost[id]) == "undefined" || upPost[id] == 0){
  elem.nextElementSibling.innerHTML = format(parseInt(elem.nextElementSibling.innerHTML)+2);
  }
  upPost[id]=1;
  downPost[id] = 0;

}

function downvotePost(id, elem){
  elem.previousElementSibling.previousElementSibling.firstElementChild.src = "/img/upfalse.png";
  elem.firstElementChild.src = "/img/downtrue.png";
  vote("/downvote/p/"+id);

  if(typeof(downPost[id]) == "undefined" || downPost[id] == 0){
    elem.previousElementSibling.innerHTML = format(parseInt(elem.previousElementSibling.innerHTML)-2);
  }
  upPost[id] = 0;
  downPost[id]=1;
}


function upvoteComment(id, elem){
  elem.nextElementSibling.nextElementSibling.firstElementChild.src = "/img/downfalse.png";
  elem.firstElementChild.src = "/img/uptrue.png";
  vote("/upvote/c/"+id);


  if(typeof(upComment[id]) == "undefined" || upComment[id] == 0){
  elem.nextElementSibling.innerHTML = format(parseInt(elem.nextElementSibling.innerHTML)+2);
  }
  downComment[id] = 0;
  upComment[id]=1;
}

function downvoteComment(id, elem){
  elem.previousElementSibling.previousElementSibling.firstElementChild.src = "/img/upfalse.png";
  elem.firstElementChild.src = "/img/downtrue.png";
  vote("/downvote/c/"+id);

  if(typeof(downComment[id]) == "undefined" || downComment[id] == 0){
  elem.previousElementSibling.innerHTML = format(parseInt(elem.previousElementSibling.innerHTML)-2);
  }
  upComment[id] = 0;
  downComment[id]=1;
}


function vote(url){
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
         console.log(xhttp.responseText); //on debug en console
      }
  };
  xhttp.open("GET", url, true);
  xhttp.send();
}

function format(n){
  if(n>0){
    return "+"+n;
  } else {
    return n;
  }
}

export const arrayRemove = function (arr, value) {
  return arr.filter(function(ele){ 
      return ele != value; 
  });
}

export const genId = function () {
  return '_' + Math.random().toString(36).substr(2, 9);
}

export const getRandomInt = function (min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}
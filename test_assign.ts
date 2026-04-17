const obj = {
  get only() { throw new Error("only getter thrown"); }
};
Object.assign(obj, { foo: 1 });
console.log("Success");

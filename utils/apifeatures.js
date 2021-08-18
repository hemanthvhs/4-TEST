class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  // REQ - https://locoalhost:3000/api/v1/tours?sort=price,-ratingsAverage&ratingsAverage[gte]=4.5&price[gt]=1000&fields=name,tour,price,ratingsAverage7&page=1&limit=3
  //  Query String - { sort: 'price,-ratingsAverage',
  //                   ratingsAverage: { gte: '4.5' },
  //                   price: { gt: '1000' },
  //                   fields: 'name,tour,price,ratingsAverage',
  //                   page: 1,
  //                   limit: 3 }
  filter() {
    // Always take shallow copy of query string. Because, we will removing some strings from the query for fitering & those fields may be required other methods
    const queryObj = { ...this.queryString };
    // The below mentioned fields need to be removed from the queryObj
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    // Deleting the excludedFields properties if available in queryObj. This will not mutate queryString as we took {...}shallow copy in the beginning of filter method.
    excludedFields.forEach((el) => delete queryObj[el]);
    // Now we need to update gt,gte,lt,lte with $gte,$gt,$lte,$lt.
    // Inorder to do that we need to convert our object to string.
    let queryStr = JSON.stringify(queryObj); // Inorder to use replace we need to convert object to JSON string
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    console.log(JSON.parse(queryStr));
    // Updating the query based on the filter() operation. This query is chained to next method
    // After parsing JSON string, object will be like { ratingsAverage: { $gte: '4.5}, price: { $gt: '1000'}}
    this.query = this.query.find(JSON.parse(queryStr)); // Convert JSON string to object
    return this;
  }

  sort() {
    // Check if our queryString object contains sort property
    if (this.queryString.sort) {
      // Since these are comma (,) separated we need to split & join with space( )
      // {sort: 'price, -ratingsAverage'}
      const sortBy = this.queryString.sort.split(',').join(' ');
      // sortBy = 'price -ratingsAverage' ==> This is valid syntax that we can pass to sort method of mongoose
      this.query = this.query.sort(sortBy);
    } else {
      // If sort property is not availble then by default we are sorting by createdAt in descending order
      this.query = this.query.sort('-createdAt');
    }
    // Updating the query based on the filter() operation. This query is chained to next method
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = +this.queryString.page || 1;
    const limit = +this.queryString.limit || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;

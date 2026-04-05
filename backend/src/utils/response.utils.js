export function success(res, data = null, message = 'Success', statusCode = 200) {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  return res.status(statusCode).json(body);
}

export function successWithPagination(res, data, pagination, message = 'Success') {
  return res.status(200).json({
    success: true,
    data,
    pagination,
    message,
  });
}

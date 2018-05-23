uba_auditTrail.on('update:before', function () {
  throw new Error('<<< Deletion from audit entity is not allowed. Use database level access instead >>>')
})

uba_auditTrail.on('delete:before', function () {
  throw new Error('<<< Audit update is imposible >>>')
})

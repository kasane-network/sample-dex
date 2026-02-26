import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client'

const disabledGraphqlLink = new ApolloLink(() => {
  return new Observable((observer) => {
    observer.next({ data: {} })
    observer.complete()
  })
})

export const apolloClient = new ApolloClient({
  connectToDevTools: true,
  link: disabledGraphqlLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-only',
    },
    query: {
      fetchPolicy: 'cache-only',
    },
  },
})


type User = {
    id: string
    name: string,
    username: string,
    admin: boolean,
    teacher: boolean | null,
    teacherGroups?: string[],
    isArchive: boolean
}
export default User
